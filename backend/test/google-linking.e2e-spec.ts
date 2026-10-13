import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { PublicActivityService } from '../src/users/public-activity.service';
import { createTestApp } from './create-test-app';
import { signInWithGoogle, stubGoogle } from './google-stub';

// Google sign-in onto an existing account with the same email (ADR 003).
// Someone may have registered that email with a password before its real
// owner arrives with Google.
describe('Google account linking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let logLines: string[];
  const EMAIL = 'owner@example.com';
  const PASSWORD = 'squatter-password-1';

  const http = () => request(app.getHttpServer());
  // The callback always clears the oauth_state cookie; what matters is
  // whether a session cookie was issued.
  const sessionCookieIn = (res: { headers: Record<string, unknown> }) =>
    ((res.headers['set-cookie'] as string[] | undefined) ?? []).find((c) => c.startsWith('session_token='));
  // A full Google sign-in: start (state cookie) and callback.
  const callback = () => signInWithGoogle(app);
  const passwordLogin = () => http().post('/auth/login').send({ email: EMAIL, password: PASSWORD });
  const registerWithPassword = async () => {
    const res = await http()
      .post('/auth/register')
      .send({ acceptedTerms: true, email: EMAIL, password: PASSWORD, username: 'early', name: 'Early' })
      .expect(201);
    return res.headers['set-cookie'] as unknown as string[];
  };
  const account = () => prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
  const addThesis = async (authorId: string, status: 'DRAFT' | 'ACTIVE') => {
    const security = await prisma.security.upsert({
      where: { ticker: 'GLTEST' },
      update: {},
      create: { ticker: 'GLTEST', companyName: 'Linking Test Plc', currentPrice: 1 },
    });
    return prisma.thesis.create({
      data: { authorId, securityId: security.id, statement: 's', targetPrice: 1, conviction: 5, horizonDays: 30, status },
    });
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    logLines = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logLines.push(args.map(String).join(' '));
      });
    }
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.counterThesis.deleteMany();
    await prisma.thesis.deleteMany();
    await prisma.user.deleteMany();
    await prisma.security.deleteMany({ where: { ticker: 'GLTEST' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('links an account with no public activity: removes its password, ends its sessions, keeps its drafts', async () => {
    const earlyCookie = await registerWithPassword();
    const draft = await addThesis((await account()).id, 'DRAFT');
    stubGoogle(app, { id: 'g-owner', email: 'Owner@Example.com', verified: true });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/dashboard\?notice=google-now-sign-in$/);
    await http().get('/auth/me').set('Cookie', res.headers['set-cookie']).expect(200);
    await http().get('/auth/me').set('Cookie', earlyCookie).expect(401);
    await passwordLogin().expect(401);
    expect(await account()).toMatchObject({ googleId: 'g-owner', passwordHash: null, sessionVersion: 1 });
    expect(await prisma.thesis.findUnique({ where: { id: draft.id } })).not.toBeNull();
  });

  it('refuses to link an account with a published thesis, changes nothing, and logs no email', async () => {
    const earlyCookie = await registerWithPassword();
    await addThesis((await account()).id, 'ACTIVE');
    const before = await account();
    stubGoogle(app, { id: 'g-owner', email: EMAIL, verified: true });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google-link-refused$/);
    expect(sessionCookieIn(res)).toBeUndefined();
    expect(await account()).toEqual(before);
    await passwordLogin().expect(200);
    await http().get('/auth/me').set('Cookie', earlyCookie).expect(200);
    expect(logLines).toContain(`google_link_refused userId=${before.id} reason=published_work`);
    expect(logLines.join('\n').toLowerCase()).not.toContain(EMAIL);
  });

  it('refuses to link an account whose only public activity is a counter-thesis', async () => {
    await registerWithPassword();
    const other = await prisma.user.create({ data: { email: 'other@example.com', username: 'other', name: 'Other' } });
    const thesis = await addThesis(other.id, 'ACTIVE');
    const before = await account();
    await prisma.counterThesis.create({
      data: { thesisId: thesis.id, authorId: before.id, targetPrice: 1, conviction: 5, horizonDays: 30, reasoning: 'r' },
    });
    stubGoogle(app, { id: 'g-owner', email: EMAIL, verified: true });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google-link-refused$/);
    expect(await account()).toEqual(before);
  });

  // Before this change, the existing googleId was silently overwritten,
  // cutting the first Google account out.
  it('refuses, rather than relinks, an account already tied to a different Google account', async () => {
    await prisma.user.create({ data: { email: EMAIL, username: 'googler', name: 'G', googleId: 'g-first' } });
    stubGoogle(app, { id: 'g-second', email: EMAIL, verified: true });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google-link-refused$/);
    expect((await account()).googleId).toBe('g-first');
    expect(logLines.some((l) => l.includes('reason=different_google_account'))).toBe(true);
  });

  it.each([
    ['says it is not verified', false],
    ['sends no verified flag', undefined],
  ])('refuses a Google email that Google %s, creating and linking nothing', async (_label, verified) => {
    stubGoogle(app, { id: 'g-new', email: EMAIL, verified });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google$/);
    expect(sessionCookieIn(res)).toBeUndefined();
    expect(await prisma.user.count()).toBe(0);
  });

  // A real write conflict, not a mocked one: the activity check is paused
  // while another transaction publishes a draft and commits, so the
  // linking transaction's decision is out of date when it writes.
  it('a publish committed mid-link fails the link (P2034): generic error, nothing changed', async () => {
    await registerWithPassword();
    const before = await account();
    const draft = await addThesis(before.id, 'DRAFT');
    const activity = app.get(PublicActivityService);
    const realCheck = activity.exists.bind(activity);
    jest.spyOn(activity, 'exists').mockImplementation(async (tx, userId) => {
      const answer = await realCheck(tx, userId); // false: only a draft so far
      await prisma.$transaction(
        async (other) => {
          await other.user.findUnique({ where: { id: userId } });
          await other.thesis.update({ where: { id: draft.id }, data: { status: 'ACTIVE' } });
        },
        { isolationLevel: 'Serializable' },
      );
      return answer;
    });
    stubGoogle(app, { id: 'g-owner', email: EMAIL, verified: true });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google$/);
    expect(sessionCookieIn(res)).toBeUndefined();
    expect(await account()).toEqual(before);
    expect(logLines).toContain('google_sign_in_failed error=PrismaClientKnownRequestError code=P2034');
  });

  // Google's docs show email_verified as the string "true"; it must work
  // end to end, through the real callback, not only in the unit test.
  it('accepts email_verified sent as the string "true"', async () => {
    stubGoogle(app, { id: 'g-new', email: EMAIL, verified: 'true' });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/welcome\/terms\?next=%2Fdashboard$/);
    expect((await account()).googleId).toBe('g-new');
  });

  it('refuses email_verified sent as the string "false"', async () => {
    stubGoogle(app, { id: 'g-new', email: EMAIL, verified: 'false' });

    const res = await callback();

    expect(res.headers.location).toMatch(/\/login\?error=google$/);
    expect(await prisma.user.count()).toBe(0);
  });

  it('still signs in a returning Google user, and creates a new one with a lowercased email', async () => {
    stubGoogle(app, { id: 'g-new', email: 'New.Person@Example.com', verified: true });

    const first = await callback();
    expect(first.headers.location).toMatch(/\/welcome\/terms\?next=%2Fdashboard$/);
    expect((await prisma.user.findFirstOrThrow({ where: { googleId: 'g-new' } })).email).toBe('new.person@example.com');

    const again = await callback();
    expect(again.headers.location).toMatch(/\/welcome\/terms\?next=%2Fdashboard$/);
    expect(await prisma.user.count()).toBe(1);
  });
});
