import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// Prisma 7 generates the client to a custom output path rather than
// @prisma/client directly (see prisma/schema.prisma generator block).
// Run `npx prisma generate` after any schema change — `migrate dev` no
// longer regenerates the client automatically as of Prisma 7.
import { PrismaClient } from '../../generated/prisma/client';
// Prisma 7 requires an explicit driver adapter for the runtime client —
// there is no more built-in "just pass a url" engine. This is the
// standard node-postgres adapter for a plain PostgreSQL connection.
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
