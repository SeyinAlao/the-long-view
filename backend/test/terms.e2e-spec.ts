import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../src/prisma/prisma.service';
import { TERMS_VERSION } from '../src/auth/terms';
import { createTestApp } from './create-test-app';

// ADR 014: the Terms checkpoint, enforced by the API, not only the pages.
describe('Terms acceptance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const PASSWORD = 'correct-horse-battery';
  const statement =
    'Volumes recover as credit eases, and the market has not priced the next two quarters of margin recovery in yet.';

  const server = () => request(app.getHttpServer());
  const register = (body: Record<string, unknown>) =>
    server()
      .post('/auth/register')
      .send({
        email: 'new@example.com',
        username: 'new_terms',
        password: PASSWORD,
        name: 'New',
        ...body,
      });

  // An account from before the checkpoint (null) or after a version change.
  async function signedInWithTerms(termsVersion: string | null): Promise<string[]> {
    await prisma.user.create({
      data: {
        email: 'old@example.com',
        username: 'old_terms',
        name: 'Old',
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        termsVersion,
      },
    });
    const res = await server()
      .post('/auth/login')
      .send({ email: 'old@example.com', password: PASSWORD })
      .expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  }

  const draft = (cookie: string[]) =>
    server()
      .post('/theses')
      .set('Cookie', cookie)
      .send({ ticker: 'DANGCEM', statement, targetPrice: 1300, conviction: 6, horizonDays: 180 });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.thesisMetric.deleteMany({});
    await prisma.thesis.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(() => app.close());

  describe('sign-up', () => {
    it.each([[{}], [{ acceptedTerms: false }], [{ acceptedTerms: 'yes' }]])(
      'refuses %p without agreeing, saying why',
      async (body) => {
        const res = await register(body).expect(400);
        expect(res.body.message).toContainEqual(
          expect.stringContaining('confirm you are 18 or older and agree to the Terms of Service'),
        );
      },
    );

    it('records the version and time when agreeing, and reports it as accepted', async () => {
      const res = await register({ acceptedTerms: true }).expect(201);
      expect(res.body.user.termsAccepted).toBe(true);
      const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'new@example.com' } });
      expect(stored.termsVersion).toBe(TERMS_VERSION);
      expect(stored.termsAcceptedAt).toBeInstanceOf(Date);
    });
  });

  describe('accounts without the current version', () => {
    it.each([
      ['from before the checkpoint', null],
      ['after a version change', '2000-01-01'],
      ['that accepted 2026-10-07, before the age declaration', '2026-10-07'],
    ])('%s: can read, but every write is refused until they accept', async (_, version) => {
      const cookie = await signedInWithTerms(version);

      const me = await server().get('/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body.user.termsAccepted).toBe(false);
      await server().get('/theses/mine').set('Cookie', cookie).expect(200);

      const refused = await draft(cookie).expect(403);
      expect(refused.body.error).toBe('terms_not_accepted');

      const accepted = await server().post('/auth/accept-terms').set('Cookie', cookie).expect(200);
      expect(accepted.body.user.termsAccepted).toBe(true);
      await draft(cookie).expect(201);
    });

    it('every write route is guarded: edit, publish, counter and discard too', async () => {
      const author = await signedInWithTerms(TERMS_VERSION);
      const id = (await draft(author).expect(201)).body.id;
      await prisma.user.update({
        where: { email: 'old@example.com' },
        data: { termsVersion: null },
      });

      // Built when sent: a supertest request made early loses its server.
      for (const call of [
        () => server().patch(`/theses/${id}`).set('Cookie', author).send({ conviction: 7 }),
        () =>
          server().post(`/theses/${id}/publish`).set('Cookie', author).send({ confirmed: true }),
        () =>
          server()
            .post(`/theses/${id}/counter`)
            .set('Cookie', author)
            .send({ reasoning: statement, targetPrice: 1, conviction: 5, horizonDays: 90 }),
        () => server().delete(`/theses/${id}`).set('Cookie', author),
      ]) {
        const res = await call().expect(403);
        expect(res.body.error).toBe('terms_not_accepted');
      }
    });

    it('accepting needs a session', async () => {
      await server().post('/auth/accept-terms').expect(401);
    });
  });

  describe('publishing', () => {
    it('needs the author to confirm what publishing means', async () => {
      const cookie = await signedInWithTerms(TERMS_VERSION);
      const dangcem = await prisma.security.findUniqueOrThrow({ where: { ticker: 'DANGCEM' } });
      const price = await prisma.price.create({ data: { securityId: dangcem.id, price: 1066.7 } });
      try {
        const id = (await draft(cookie).expect(201)).body.id;
        for (const body of [{}, { confirmed: false }]) {
          const res = await server()
            .post(`/theses/${id}/publish`)
            .set('Cookie', cookie)
            .send(body)
            .expect(400);
          expect(res.body.message).toContainEqual(expect.stringContaining('not investment advice'));
        }
        await server()
          .post(`/theses/${id}/publish`)
          .set('Cookie', cookie)
          .send({ confirmed: true })
          .expect(201);
      } finally {
        await prisma.price.delete({ where: { id: price.id } });
      }
    });
  });
});
