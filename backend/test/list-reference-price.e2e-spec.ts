import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// The reference price is NGX's close on the day a thesis was published.
// It belongs on one thesis's page, not in lists (ADR 012): the Ledger
// and "my theses" lists carry the author's own numbers only.
describe('Reference price stays out of list responses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let thesisId: string;
  let cookie: string[];

  async function wipe() {
    await prisma.thesisMetric.deleteMany({ where: {} });
    await prisma.counterThesis.deleteMany({ where: {} });
    await prisma.thesisOutcome.deleteMany({ where: {} });
    await prisma.thesis.deleteMany({ where: {} });
    await prisma.user.deleteMany();
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await wipe();
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: 'lister@example.com', username: 'lister', password: 'correct-horse-battery', name: 'Lister' });
    cookie = res.headers['set-cookie'] as unknown as string[];
    const author = await prisma.user.findUniqueOrThrow({ where: { username: 'lister' } });
    const security = await prisma.security.findUniqueOrThrow({ where: { ticker: 'MTNN' } });
    const thesis = await prisma.thesis.create({
      data: {
        authorId: author.id,
        securityId: security.id,
        status: 'ACTIVE',
        referencePrice: 847,
        targetPrice: 1000,
        conviction: 7,
        horizonDays: 180,
        statement:
          'Pricing power is returning to the leader and the next six months should reward patience as distribution strength compounds over time.',
        publishedAt: new Date(),
      },
    });
    thesisId = thesis.id;
  });

  afterAll(async () => {
    await wipe();
    await app.close();
  });

  it('the public Ledger list has the author\'s target and no reference price', async () => {
    const res = await request(app.getHttpServer()).get('/theses').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].targetPrice).toBeDefined();
    expect('referencePrice' in res.body[0]).toBe(false);

    const byTicker = await request(app.getHttpServer()).get('/theses?ticker=MTNN').expect(200);
    expect('referencePrice' in byTicker.body[0]).toBe(false);
  });

  it('the author\'s own list has none either', async () => {
    const res = await request(app.getHttpServer()).get('/theses/mine').set('Cookie', cookie).expect(200);
    expect(res.body).toHaveLength(1);
    expect('referencePrice' in res.body[0]).toBe(false);
  });

  it('one thesis still carries it, to anyone', async () => {
    const res = await request(app.getHttpServer()).get(`/theses/${thesisId}`).expect(200);
    expect(Number(res.body.referencePrice)).toBe(847);
  });
});
