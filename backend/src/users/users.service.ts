import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
  name: string;
}

interface RawUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  passwordHash: string;
}

// Callers outside this service should only ever see this shape — never
// passwordHash. Every read path funnels through toSafeUser before it
// leaves the service.
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
    const user = await this.prisma.user.create({ data: input });
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

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toSafeUser(user) : null;
  }

  toSafeUser(user: RawUser): SafeUser {
    const { id, email, username, name, bio, avatarUrl, createdAt } = user;
    return { id, email, username, name, bio, avatarUrl, createdAt };
  }
}
