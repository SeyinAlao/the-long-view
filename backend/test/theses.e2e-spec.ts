import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Theses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  async function registerAndGetCookie(email: string, username: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username, password: 'correct-horse-battery', name: 'Test User' });
    return res.headers['set-cookie'];
  }

  const validThesisBody = {
    ticker: 'DANGCEM',
    statement:
      'Pricing power is returning to the leader and the next six months should reward patience as distribution strength compounds over time.',
    targetPrice: 1350,
    conviction: 8,
    horizonDays: 180,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.thesisMetric.deleteMany({ where: {} });
    await prisma.thesis.deleteMany({ where: {} });
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a statement under 80 characters', async () => {
    const cookie = await registerAndGetCookie('short@example.com', 'shortstatement');
    await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send({ ...validThesisBody, statement: 'too short' })
      .expect(400);
  });

  it('rejects creating a thesis with no session', async () => {
    await request(app.getHttpServer()).post('/theses').send(validThesisBody).expect(401);
  });

  it('a draft is visible to its author but hidden from everyone else', async () => {
    const cookie = await registerAndGetCookie('draftowner@example.com', 'draftowner');
    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send(validThesisBody)
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.referencePrice).toBeNull();

    await request(app.getHttpServer()).get(`/theses/${created.body.id}`).set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).get(`/theses/${created.body.id}`).expect(404);
  });

  it('publishing sets an automatic reference price and locks the thesis from further edits', async () => {
    const cookie = await registerAndGetCookie('publisher@example.com', 'publisher');
    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send(validThesisBody)
      .expect(201);

    const published = await request(app.getHttpServer())
      .post(`/theses/${created.body.id}/publish`)
      .set('Cookie', cookie)
      .expect(201);

    expect(published.body.status).toBe('ACTIVE');
    expect(published.body.referencePrice).not.toBeNull();

    // Now visible with no session at all.
    await request(app.getHttpServer()).get(`/theses/${created.body.id}`).expect(200);

    // And locked — even its own author can no longer edit it.
    await request(app.getHttpServer())
      .patch(`/theses/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ conviction: 10 })
      .expect(403);
  });

  it('refuses to let someone publish or edit a draft that belongs to someone else', async () => {
    const ownerCookie = await registerAndGetCookie('owner2@example.com', 'owner2');
    const intruderCookie = await registerAndGetCookie('intruder2@example.com', 'intruder2');

    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', ownerCookie)
      .send(validThesisBody)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/theses/${created.body.id}/publish`)
      .set('Cookie', intruderCookie)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/theses/${created.body.id}`)
      .set('Cookie', intruderCookie)
      .send({ conviction: 1 })
      .expect(403);
  });

  it('a published thesis shows up in the public feed, filterable by ticker', async () => {
    const cookie = await registerAndGetCookie('feedauthor@example.com', 'feedauthor');
    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send(validThesisBody)
      .expect(201);
    await request(app.getHttpServer()).post(`/theses/${created.body.id}/publish`).set('Cookie', cookie).expect(201);

    const feed = await request(app.getHttpServer()).get('/theses?ticker=DANGCEM').expect(200);
    expect(feed.body.some((t: { id: string }) => t.id === created.body.id)).toBe(true);
  });

  it('discarding a draft removes it, but a published thesis cannot be discarded', async () => {
    const cookie = await registerAndGetCookie('discarder@example.com', 'discarder');
    const created = await request(app.getHttpServer())
      .post('/theses')
      .set('Cookie', cookie)
      .send(validThesisBody)
      .expect(201);

    await request(app.getHttpServer()).delete(`/theses/${created.body.id}`).set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).get(`/theses/${created.body.id}`).set('Cookie', cookie).expect(404);
  });
});
