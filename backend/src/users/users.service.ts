import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  username: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
}

interface RawUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  passwordHash: string | null;
  googleId: string | null;
}

// Callers outside this service should only ever see this shape — never
// passwordHash, never googleId. Every read path funnels through
// toSafeUser before it leaves the service.
export type SafeUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<SafeUser> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        name: input.name,
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
      },
    });
    return this.toSafeUser(user);
  }

  async linkGoogleId(userId: string, googleId: string): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return this.toSafeUser(user);
  }

  // Raw lookups — includes passwordHash. Only AuthService should call
  // these, and only to check a password before immediately discarding it.
  async findByEmail(email: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByGoogleId(googleId: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toSafeUser(user) : null;
  }

  // Google doesn't give us a username, so we derive a candidate from the
  // email and disambiguate on collision. Not exposed outside this
  // service — AuthService just wants a valid, available username back.
  async generateUsernameFromEmail(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 25) || 'user';

    let candidate = base;
    let attempt = 0;
    while (await this.findByUsername(candidate)) {
      attempt += 1;
      candidate = `${base}${Math.floor(Math.random() * 10000)}`;
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
    return { id, email, username, name, bio, avatarUrl, createdAt };
  }
}
