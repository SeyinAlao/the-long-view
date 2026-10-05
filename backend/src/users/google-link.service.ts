import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicActivityService } from './public-activity.service';
import type { RawUser } from './users.service';

export type GoogleLinkResult =
  | { outcome: 'linked'; user: RawUser; passwordCleared: boolean }
  | { outcome: 'refused'; reason: 'published_work' | 'different_google_account' };

// Joining a Google sign-in onto an existing account with the same email
// (ADR 003, amended October 2026). Google has just proved this person
// controls the address; the account's password, set at sign-up, never
// proved anything. So:
// - an account already tied to a different Google account is refused,
//   never silently relinked;
// - a password account with public activity is refused: that work can't
//   be handed to whoever proves the email later;
// - otherwise the Google id is linked, any password is removed, and
//   every existing session ends (sessionVersion), all in one transaction.
//   Drafts stay.
@Injectable()
export class GoogleLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicActivity: PublicActivityService,
  ) {}

  // Serializable, so the activity check and the update are one consistent
  // decision: if a publish commits in between, Postgres fails this
  // transaction (Prisma P2034) and nothing is linked.
  async link(userId: string, googleId: string): Promise<GoogleLinkResult> {
    return this.prisma.$transaction(
      async (tx): Promise<GoogleLinkResult> => {
        const account = await tx.user.findUniqueOrThrow({ where: { id: userId } });

        if (account.googleId && account.googleId !== googleId) {
          return { outcome: 'refused', reason: 'different_google_account' };
        }
        if (!account.passwordHash) {
          const user = await tx.user.update({ where: { id: userId }, data: { googleId } });
          return { outcome: 'linked', user, passwordCleared: false };
        }
        if (await this.publicActivity.exists(tx, userId)) {
          return { outcome: 'refused', reason: 'published_work' };
        }

        const user = await tx.user.update({
          where: { id: userId },
          data: { googleId, passwordHash: null, sessionVersion: { increment: 1 } },
        });
        return { outcome: 'linked', user, passwordCleared: true };
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
