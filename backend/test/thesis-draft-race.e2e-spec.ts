import { ForbiddenException, INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { ThesesService } from '../src/theses/theses.service';
import { createTestApp } from './create-test-app';

// Audit F-11. Every write to a draft first checks it is a draft, in a
// separate query; a publish can land between that check and the write.
// These tests recreate that moment deterministically: the thesis is
// already published in the database, but the check is handed the stale,
// still-a-draft copy it would have read a moment earlier.
describe('Draft writes racing a publish (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let theses: ThesesService;
  let authorId: string;
  let thesisId: string;
  const statement =
    'Publishing locks this text for good, so an edit racing the publish must never change what was locked in place.';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    theses = app.get(ThesesService);
    authorId = (await prisma.user.create({ data: { email: 'race@example.com', username: 'race_author', name: 'Race' } }))
      .id;
  });

  beforeEach(async () => {
    const security = await prisma.security.findUniqueOrThrow({ where: { ticker: 'ZENITHBANK' } });
    const thesis = await prisma.thesis.create({
      data: {
        authorId,
        securityId: security.id,
        statement,
        targetPrice: 60,
        conviction: 6,
        horizonDays: 90,
        metrics: { create: [{ label: 'P/E', value: '3.1' }] },
      },
    });
    thesisId = thesis.id;
    // The stale read: what the check saw just before the publish committed.
    jest.spyOn(prisma.thesis, 'findUnique').mockResolvedValueOnce(thesis);
    // The publish that won the race.
    await prisma.thesis.update({
      where: { id: thesisId },
      data: { status: 'ACTIVE', publishedAt: new Date(), referencePrice: 55.5 },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.thesisMetric.deleteMany({ where: { thesisId } });
    await prisma.thesis.deleteMany({ where: { id: thesisId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: authorId } });
    await app.close();
  });

  it('an edit is refused and changes nothing, metrics included', async () => {
    await expect(
      theses.updateDraft(thesisId, authorId, { statement: `${statement} Edited.`, metrics: [{ label: 'New', value: '1' }] }),
    ).rejects.toThrow(ForbiddenException);

    const after = await prisma.thesis.findUniqueOrThrow({ where: { id: thesisId }, include: { metrics: true } });
    expect(after.statement).toBe(statement);
    expect(after.metrics.map((m) => m.label)).toEqual(['P/E']);
  });

  it('a second publish is refused and keeps the locked reference price', async () => {
    const security = await prisma.security.findUniqueOrThrow({ where: { ticker: 'ZENITHBANK' } });
    const price = await prisma.price.create({ data: { securityId: security.id, price: 99.99 } });
    try {
      await expect(theses.publish(thesisId, authorId)).rejects.toThrow(ForbiddenException);
      const after = await prisma.thesis.findUniqueOrThrow({ where: { id: thesisId } });
      expect(Number(after.referencePrice)).toBe(55.5);
    } finally {
      await prisma.price.delete({ where: { id: price.id } });
    }
  });

  it('a discard is refused and the published thesis stays', async () => {
    await expect(theses.discardDraft(thesisId, authorId)).rejects.toThrow(ForbiddenException);
    await expect(prisma.thesis.findUnique({ where: { id: thesisId } })).resolves.not.toBeNull();
  });
});
