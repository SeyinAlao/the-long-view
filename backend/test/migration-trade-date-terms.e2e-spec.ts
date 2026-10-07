import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Migration 20261007120000: one close per company per trading day, while
// rows without a trading day (everything saved before it) never clash.
describe('Migration: Price.tradeDate and User terms columns (e2e)', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let securityId: string;

  beforeAll(async () => {
    securityId = (await prisma.security.findUniqueOrThrow({ where: { ticker: 'GTCO' } })).id;
  });

  afterEach(() => prisma.price.deleteMany({ where: { securityId, price: { in: [131.11, 132.22] } } }));
  afterAll(() => prisma.$disconnect());

  it('allows any number of rows without a trade date for one company', async () => {
    await prisma.price.create({ data: { securityId, price: 131.11 } });
    await expect(prisma.price.create({ data: { securityId, price: 131.11 } })).resolves.toBeDefined();
  });

  it('refuses a second row for the same company and trading day', async () => {
    const tradeDate = new Date('2026-10-06T00:00:00Z');
    await prisma.price.create({ data: { securityId, price: 132.22, tradeDate } });
    await expect(prisma.price.create({ data: { securityId, price: 132.22, tradeDate } })).rejects.toThrow(
      /Unique constraint/,
    );
  });

  it('leaves the terms columns empty until someone accepts', async () => {
    const user = await prisma.user.create({
      data: { email: 'terms-migration@example.com', username: 'terms_migration', name: 'Terms' },
    });
    try {
      expect(user).toMatchObject({ termsVersion: null, termsAcceptedAt: null });
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
