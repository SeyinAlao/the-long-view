import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomInt } from 'crypto';
import { normaliseEmail } from './normalise-email';
import { hasAcceptedCurrentTerms, TERMS_VERSION } from '../auth/terms';

export interface CreateUserInput {
  email: string;
  username: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  // True only when the person ticked the Terms box (email sign-up).
  acceptedTerms?: boolean;
}

// The full row. Only AuthService handles it, to check a password or to
// sign a session token (which needs sessionVersion), and it hands
// anything else only the SafeUser from toSafeUser.
export interface RawUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  passwordHash: string | null;
  googleId: string | null;
  sessionVersion: number;
  termsVersion: string | null;
}

// Callers outside this service should only ever see this shape — never
// passwordHash, googleId or sessionVersion. Every read path funnels
// through toSafeUser before it leaves the service.
export type SafeUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  // Whether they've accepted the current Terms (ADR 014). Not the
  // version itself: that's the server's business.
  termsAccepted: boolean;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<RawUser> {
    return this.prisma.user.create({
      data: {
        email: normaliseEmail(input.email),
        username: input.username,
        name: input.name,
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        ...(input.acceptedTerms && { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() }),
      },
    });
  }

  // Records acceptance of the current Terms (ADR 014).
  async acceptTerms(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() },
    });
    return this.toSafeUser(user);
  }

  // Raw lookups — includes passwordHash. Only AuthService should call
  // these, and only to check a password before immediately discarding it.
  async findByEmail(email: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { email: normaliseEmail(email) } });
  }

  async findByUsername(username: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByGoogleId(googleId: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  // For checking a session token on every request: the user, plus the
  // session version the token must still match.
  async findSessionUser(id: string): Promise<{ user: SafeUser; sessionVersion: number } | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? { user: this.toSafeUser(user), sessionVersion: user.sessionVersion } : null;
  }

  // Ends every session this person has, on every device: tokens issued
  // before this carry an older version and are refused from now on.
  async endAllSessions(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
  }

  // Google doesn't give us a username, so we derive a candidate from the
  // email and disambiguate on collision. Not exposed outside this
  // service — AuthService just wants a valid, available username back.
  async generateUsernameFromEmail(email: string): Promise<string> {
    const base =
      email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 25) || 'user';

    let candidate = base;
    let attempt = 0;
    while (await this.findByUsername(candidate)) {
      attempt += 1;
      candidate = `${base}${randomInt(10_000)}`;
      if (attempt > 20) {
        // Astronomically unlikely, but never loop forever.
        candidate = `${base}${Date.now()}`;
        break;
      }
    }
    return candidate;
  }

  toSafeUser(user: RawUser): SafeUser {
    const { id, email, username, name, bio, avatarUrl, createdAt } = user;
    return {
      id,
      email,
      username,
      name,
      bio,
      avatarUrl,
      createdAt,
      termsAccepted: hasAcceptedCurrentTerms(user),
    };
  }
}
