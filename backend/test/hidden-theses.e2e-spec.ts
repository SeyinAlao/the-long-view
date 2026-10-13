import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { EvaluationService } from '../src/evaluation/evaluation.service';
import { hideThesis, unhideThesis } from '../src/theses/takedown';
import { lagosDate } from '../src/market-data/feed-checks';
import { createTestApp } from './create-test-app';

// The operator's takedown (Terms, section 7; plans section 24): a hidden
// thesis is not graded, not scored, not listed and not readable, except
// by its author, who is told it was removed, without the reason.
describe('Hidden theses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let securityId: string;
  const REASON = 'seed_placeholder_price';
  const DAY_MS = 24 * 60 * 60 * 1000;

  async function register(username: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: `${username}@example.com`, username, password: 'correct-horse-battery', name: username });
    const user = await prisma.user.findUniqueOrThrow({ where: { username } });
    return { cookie: res.headers['set-cookie'], id: user.id };
  }

  function seedThesis(
    authorId: string,
    extra: { publishedAt?: Date; horizonDays?: number; status?: 'ACTIVE' | 'EVALUATED' | 'DRAFT' } = {},
  ) {
    return prisma.thesis.create({
      data: {
        authorId,
        securityId,
        status: extra.status ?? 'ACTIVE',
        referencePrice: 100,
        targetPrice: 130,
        conviction: 8,
        horizonDays: extra.horizonDays ?? 30,
        statement:
          'Pricing power is returning to the leader and the next six months should reward patience as distribution strength compounds over time.',
        publishedAt: extra.status === 'DRAFT' ? null : (extra.publishedAt ?? new Date()),
      },
    });
  }

  async function wipe() {
    await prisma.thesisMetric.deleteMany({ where: {} });
    await prisma.counterThesis.deleteMany({ where: {} });
    await prisma.thesisOutcome.deleteMany({ where: {} });
    await prisma.thesis.deleteMany({ where: {} });
    await prisma.price.deleteMany({ where: { securityId } });
    await prisma.user.deleteMany();
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    securityId = (await prisma.security.findUniqueOrThrow({ where: { ticker: 'MTNN' } })).id;
  });

  beforeEach(wipe);
  afterEach(wipe);
  afterAll(() => app.close());

  it('leaves every public read, 404s for everyone else, and tells the author without the reason', async () => {
    const author = await register('hidden_author');
    const other = await register('hidden_other');
    const thesis = await seedThesis(author.id);
    const http = request(app.getHttpServer());

    const listed = await http.get('/theses').expect(200);
    expect(listed.body.map((t: { id: string }) => t.id)).toContain(thesis.id);

    await hideThesis(prisma, thesis.id, REASON);

    expect((await http.get('/theses').expect(200)).body).toEqual([]);
    expect((await http.get('/theses?ticker=MTNN').expect(200)).body).toEqual([]);

    await http.get(`/theses/${thesis.id}`).expect(404);
    await http.get(`/theses/${thesis.id}`).set('Cookie', other.cookie).expect(404);

    const own = await http.get(`/theses/${thesis.id}`).set('Cookie', author.cookie).expect(200);
    expect(own.body.id).toBe(thesis.id);
    expect(own.body.hiddenAt).toEqual(expect.any(String));
    expect(own.body.statement).toBeUndefined();
    expect(JSON.stringify(own.body)).not.toContain(REASON);

    const mine = await http.get('/theses/mine').set('Cookie', author.cookie).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].hiddenAt).toEqual(expect.any(String));
    expect(JSON.stringify(mine.body)).not.toContain(REASON);

    // Unhiding puts it back, exactly as it was.
    await unhideThesis(prisma, thesis.id);
    expect((await http.get(`/theses/${thesis.id}`).expect(200)).body.statement).toBeDefined();
  });

  it('cannot be countered while hidden', async () => {
    const author = await register('counter_author');
    const critic = await register('counter_critic');
    const thesis = await seedThesis(author.id);
    await hideThesis(prisma, thesis.id, REASON);

    await request(app.getHttpServer())
      .post(`/theses/${thesis.id}/counter`)
      .set('Cookie', critic.cookie)
      .send({ targetPrice: 80, conviction: 6, horizonDays: 90, reasoning: 'x'.repeat(80) })
      .expect(404);
    expect(await prisma.counterThesis.count()).toBe(0);
  });

  it('the Leaderboard ignores any outcome on a hidden thesis', async () => {
    const author = await register('board_author');
    const kept = await seedThesis(author.id, { status: 'EVALUATED' });
    const removed = await seedThesis(author.id, { status: 'EVALUATED' });
    for (const [thesis, score] of [
      [kept, 2],
      [removed, 5],
    ] as const) {
      await prisma.thesisOutcome.create({
        data: { thesisId: thesis.id, evaluationPrice: 120, targetReturn: 0.3, actualReturn: 0.2, outcomeScore: score },
      });
    }
    const http = request(app.getHttpServer());

    const before = (await http.get('/leaderboard').expect(200)).body;
    expect(before[0]).toMatchObject({ evaluatedCount: 2, totalScore: 7 });

    await hideThesis(prisma, removed.id, REASON);
    const after = (await http.get('/leaderboard').expect(200)).body;
    expect(after[0]).toMatchObject({ evaluatedCount: 1, totalScore: 2 });

    await hideThesis(prisma, kept.id, REASON);
    expect((await http.get('/leaderboard').expect(200)).body).toEqual([]);
  });

  describe('grading', () => {
    // Published 40 days ago with a 30 day horizon: due 10 days ago.
    const publishedAt = () => new Date(Date.now() - 40 * DAY_MS);
    const dueDay = () => lagosDate(new Date(publishedAt().getTime() + 30 * DAY_MS));
    const day = (date: string, plusDays = 0) => new Date(new Date(`${date}T00:00:00Z`).getTime() + plusDays * DAY_MS);

    async function seedClosesAroundDueDate() {
      const due = dueDay();
      for (const [offset, price] of [
        [-1, 90],
        [0, 120],
        [4, 150],
      ] as const) {
        await prisma.price.create({ data: { securityId, price, tradeDate: day(due, offset) } });
      }
    }

    it('evaluation skips a hidden thesis: no outcome, still active', async () => {
      const author = await register('grade_author');
      const thesis = await seedThesis(author.id, { publishedAt: publishedAt() });
      await seedClosesAroundDueDate();
      await hideThesis(prisma, thesis.id, REASON);

      const result = await app.get(EvaluationService).evaluatePendingTheses();

      expect(result).toEqual({ evaluated: 0, stillPending: 0 });
      expect(await prisma.thesisOutcome.count()).toBe(0);
      expect((await prisma.thesis.findUniqueOrThrow({ where: { id: thesis.id } })).status).toBe('ACTIVE');
    });

    it('hide, pass the due date, unhide: still graded on the first close on or after the due date', async () => {
      const author = await register('later_author');
      // Hidden while its due date is still ahead (published 10 days ago, due in 20).
      const thesis = await seedThesis(author.id, { publishedAt: new Date(Date.now() - 10 * DAY_MS) });
      await hideThesis(prisma, thesis.id, REASON);

      // The due date passes (the thesis is now 40 days old), and the daily
      // job runs while it is hidden.
      await prisma.thesis.update({ where: { id: thesis.id }, data: { publishedAt: publishedAt() } });
      await seedClosesAroundDueDate();
      const evaluation = app.get(EvaluationService);
      expect((await evaluation.evaluatePendingTheses()).evaluated).toBe(0);

      await unhideThesis(prisma, thesis.id);
      expect((await evaluation.evaluatePendingTheses()).evaluated).toBe(1);

      const outcome = await prisma.thesisOutcome.findUniqueOrThrow({ where: { thesisId: thesis.id } });
      // The due-date close (120), not the day before (90) and not the
      // newest close (150), which is the one on the day it was unhidden.
      expect(Number(outcome.evaluationPrice)).toBe(120);
      expect((await prisma.thesis.findUniqueOrThrow({ where: { id: thesis.id } })).status).toBe('EVALUATED');
    });
  });

  describe('the takedown itself', () => {
    it('keeps the reason out of API reads but stores it for the record', async () => {
      const author = await register('record_author');
      const thesis = await seedThesis(author.id);
      await hideThesis(prisma, thesis.id, REASON);

      const read = await prisma.thesis.findUniqueOrThrow({ where: { id: thesis.id } });
      expect('hiddenReason' in read).toBe(false);
      const record = await prisma.thesis.findUniqueOrThrow({
        where: { id: thesis.id },
        omit: { hiddenReason: false },
      });
      expect(record.hiddenReason).toBe(REASON);
    });

    it('refuses a missing reason, a draft, an unknown id, a repeat, and unhiding what is not hidden', async () => {
      const author = await register('refuse_author');
      const draft = await seedThesis(author.id, { status: 'DRAFT' });
      const published = await seedThesis(author.id);

      await expect(hideThesis(prisma, published.id, '')).rejects.toThrow(/reason is required/);
      await expect(hideThesis(prisma, published.id, 'Has Spaces')).rejects.toThrow(/reason is required/);
      await expect(hideThesis(prisma, draft.id, REASON)).rejects.toThrow(/draft/);
      await expect(hideThesis(prisma, 'no-such-id', REASON)).rejects.toThrow(/No thesis/);
      await expect(unhideThesis(prisma, published.id)).rejects.toThrow(/not hidden/);

      await hideThesis(prisma, published.id, REASON);
      await expect(hideThesis(prisma, published.id, REASON)).rejects.toThrow(/already hidden/);
    });
  });
});
