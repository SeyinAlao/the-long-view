import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Signing out ends every session the person has, on every device, and a
// token can't outlive that (ADR 002).
describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const account = { email: 'sessions@example.com', password: 'correct-horse-battery' };

  const signIn = async (): Promise<string[]> => {
    const res = await request(app.getHttpServer()).post('/auth/login').send(account).expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  };
  const me = (cookie?: string[]) => {
    const req = request(app.getHttpServer()).get('/auth/me');
    return cookie ? req.set('Cookie', cookie) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...account, username: 'sessions', name: 'Sessions' })
      .expect(201);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('after sign-out, the old cookie no longer works', async () => {
    const cookie = await signIn();
    await me(cookie).expect(200);

    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(200);

    await me(cookie).expect(401);
  });

  it('signing out on one device signs out every other device too', async () => {
    const laptop = await signIn();
    const phone = await signIn();

    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', phone).expect(200);

    await me(laptop).expect(401);
    await me(await signIn()).expect(200); // and signing in again works
  });

  it('a sign-out request without a session ends nobody’s sessions', async () => {
    const cookie = await signIn();

    await request(app.getHttpServer()).post('/auth/logout').expect(200);

    await me(cookie).expect(200);
  });

  // SameSite=Lax is what stops another site's hidden form from signing
  // someone out everywhere (browser test: cross-site-logout.spec.ts). It
  // must be explicit: Chromium treats a cookie without it as Lax, but not
  // every browser does, and the browser test can't tell the difference.
  it('sets the session cookie with an explicit SameSite=Lax, HttpOnly', async () => {
    const [set] = await signIn();

    expect(set).toMatch(/SameSite=Lax/);
    expect(set).toMatch(/HttpOnly/);
  });

  it('clears the cookie with the attributes it was set with', async () => {
    const cookie = await signIn();
    const res = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(200);
    const cleared = (res.headers['set-cookie'] as unknown as string[])[0];

    expect(cleared).toMatch(/^session_token=;/);
    expect(cleared).toMatch(/HttpOnly/);
    expect(cleared).toMatch(/SameSite=Lax/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('refuses a token without a session version (issued before revocation existed)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    const oldStyle = app.get(JwtService).sign({ sub: user.id, email: user.email });

    await me([`session_token=${oldStyle}`]).expect(401);
  });
});
