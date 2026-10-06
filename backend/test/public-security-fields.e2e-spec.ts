import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// The API never republishes NGX's prices (ADR 012): every company it
// returns has exactly these fields, chosen in the query itself. An exact
// match, so any other field - a price today, a new column tomorrow -
// fails this test.
const PUBLIC_FIELDS = ['companyName', 'id', 'ticker'];
const fieldsOf = (security: object) => Object.keys(security).sort();

describe('Company fields in API responses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let priceId: string;
  let thesisId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const dangcem = await prisma.security.findUniqueOrThrow({ where: { ticker: 'DANGCEM' } });
    priceId = (await prisma.price.create({ data: { securityId: dangcem.id, price: 1066.7 } })).id;
    // STACO has no entry in NGX's feed, so it never gets a price.
    await prisma.price.deleteMany({ where: { security: { ticker: 'STACO' } } });

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'fields@example.com', username: 'fields_author', password: 'correct-horse-battery', name: 'Fields' });
    const cookie = registered.headers['set-cookie'];
    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send({
        ticker: 'DANGCEM',
        statement: 'Cement demand recovers with the building season, and pricing power holds through the next two quarters.',
        targetPrice: 1200,
        conviction: 7,
        horizonDays: 180,
      })
      .expect(201);
    thesisId = created.body.id;
    await request(app.getHttpServer()).post(`/theses/${thesisId}/publish`).set('Cookie', cookie).expect(201);
  });

  afterAll(async () => {
    await prisma.thesisMetric.deleteMany({ where: { thesisId } });
    await prisma.thesis.deleteMany({ where: { id: thesisId } });
    await prisma.user.deleteMany({ where: { username: 'fields_author' } });
    await prisma.price.deleteMany({ where: { id: priceId } });
    await app.close();
  });

  it('/securities returns only the public fields, and only companies with a price', async () => {
    const all = await request(app.getHttpServer()).get('/securities').expect(200);
    const found = await request(app.getHttpServer()).get('/securities?q=dangcem').expect(200);
    for (const security of [...all.body, ...found.body]) expect(fieldsOf(security)).toEqual(PUBLIC_FIELDS);
    expect(found.body.map((s: { ticker: string }) => s.ticker)).toEqual(['DANGCEM']);
    expect(all.body.map((s: { ticker: string }) => s.ticker)).not.toContain('STACO');
  });

  it('the company search never offers a company with no price (STACO)', async () => {
    const res = await request(app.getHttpServer()).get('/securities?q=STACO').expect(200);
    expect(res.body).toEqual([]);
  });

  it('/securities/:ticker returns only the public fields, priced or not', async () => {
    for (const ticker of ['DANGCEM', 'STACO']) {
      const res = await request(app.getHttpServer()).get(`/securities/${ticker}`).expect(200);
      expect(fieldsOf(res.body)).toEqual(PUBLIC_FIELDS);
    }
  });

  it('/theses and /theses/:id carry only the public company fields, and keep the locked reference price', async () => {
    const list = await request(app.getHttpServer()).get('/theses').expect(200);
    expect(list.body.length).toBeGreaterThan(0);
    for (const thesis of list.body) expect(fieldsOf(thesis.security)).toEqual(PUBLIC_FIELDS);

    const one = await request(app.getHttpServer()).get(`/theses/${thesisId}`).expect(200);
    expect(fieldsOf(one.body.security)).toEqual(PUBLIC_FIELDS);
    expect(Number(one.body.referencePrice)).toBe(1066.7);
  });
});
