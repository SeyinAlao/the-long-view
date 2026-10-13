import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Migration 20261007180000: the two operator-only columns exist, are
// empty by default, and hold a hide time and reason.
describe('Migration: Thesis hiddenAt and hiddenReason (e2e)', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  afterAll(async () => {
    await prisma.thesis.deleteMany({ where: { statement: { startsWith: 'Hidden-columns migration test' } } });
    await prisma.user.deleteMany({ where: { username: 'hidden_migration' } });
    await prisma.$disconnect();
  });

  it('a thesis starts not hidden, and can store a hide time and reason', async () => {
    const author = await prisma.user.create({
      data: { email: 'hidden-migration@example.com', username: 'hidden_migration', name: 'Hidden' },
    });
    const security = await prisma.security.findUniqueOrThrow({ where: { ticker: 'GTCO' } });
    const thesis = await prisma.thesis.create({
      data: {
        authorId: author.id,
        securityId: security.id,
        statement: 'Hidden-columns migration test: a placeholder statement long enough to look like a thesis.',
        targetPrice: 140,
        conviction: 5,
        horizonDays: 90,
      },
    });
    expect(thesis).toMatchObject({ hiddenAt: null, hiddenReason: null });

    const hidden = await prisma.thesis.update({
      where: { id: thesis.id },
      data: { hiddenAt: new Date(), hiddenReason: 'seed_placeholder_price' },
    });
    expect(hidden.hiddenAt).toBeInstanceOf(Date);
    expect(hidden.hiddenReason).toBe('seed_placeholder_price');
  });
});
