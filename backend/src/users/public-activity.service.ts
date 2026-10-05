import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';

// The one answer to "has this person made anything public under their
// name?". Linking a Google sign-in onto a password account is refused
// when they have (ADR 003): that work can't be handed to whoever proves
// the email later. Add comments, reactions and anything else public here
// as they ship, and every caller is covered.
@Injectable()
export class PublicActivityService {
  // Takes the caller's transaction, so the answer and whatever is done
  // with it are one consistent read.
  async exists(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
    const publishedTheses = await tx.thesis.count({
      where: { authorId: userId, status: { in: ['ACTIVE', 'EVALUATED'] } },
    });
    if (publishedTheses > 0) return true;

    // Counter-theses have no draft state: one that exists is public.
    const counterTheses = await tx.counterThesis.count({ where: { authorId: userId } });
    return counterTheses > 0;
  }
}
