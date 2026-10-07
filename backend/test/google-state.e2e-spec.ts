import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';
import { TERMS_VERSION } from '../src/auth/terms';
import { finishGoogleSignIn, startGoogleSignIn, stubGoogle } from './google-stub';

// Google sign-in's `state`: every callback must answer a sign-in this
// browser started (a signed oauth_state cookie), and carries where the
// person came from (a checked ?next=). ADR 003.
describe('Google sign-in state and return path (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const EMAIL = 'state@example.com';

  const sessionCookieIn = (res: { headers: Record<string, unknown> }) =>
    ((res.headers['set-cookie'] as string[] | undefined) ?? []).find((c) => c.startsWith('session_token='));
  const stateCleared = (res: { headers: Record<string, unknown> }) =>
    ((res.headers['set-cookie'] as string[] | undefined) ?? []).some(
      (c) => c.startsWith('oauth_state=;') && c.includes('Path=/') && c.includes('Expires=Thu, 01 Jan 1970'),
    );

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => stubGoogle(app, { id: 'g-state', email: EMAIL, verified: true }));

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('starting sign-in', () => {
    it('sets a signed oauth_state cookie: HttpOnly, SameSite=Lax, Path=/, ten minutes', async () => {
      const { stateCookie } = await startGoogleSignIn(app);

      expect(stateCookie).toMatch(/^oauth_state=[\w-]+\.[\w-]+\.[\w-]+;/);
      expect(stateCookie).toMatch(/; SameSite=Lax/);
      expect(stateCookie).toMatch(/; HttpOnly/);
      expect(stateCookie).toMatch(/; Path=\//);
      expect(stateCookie).toMatch(/; Max-Age=600;/);
    });

    // Exactly these parameters: state and prompt are the only additions to
    // what the start route sent before.
    it('sends Google a state and prompt=select_account, and nothing else new', async () => {
      const { location, state } = await startGoogleSignIn(app);

      expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect([...location.searchParams.keys()].sort()).toEqual(
        ['client_id', 'prompt', 'redirect_uri', 'response_type', 'scope', 'state'].sort(),
      );
      expect(location.searchParams.get('prompt')).toBe('select_account');
      expect(state).toMatch(/^[\w-]{32}$/);
    });

    it('a fresh state each time', async () => {
      const [first, second] = [await startGoogleSignIn(app), await startGoogleSignIn(app)];
      expect(first.state).not.toBe(second.state);
    });
  });

  // A Google account that has signed in before and accepted the current
  // Terms, so these tests see where it goes back to (ADR 003). New
  // accounts go through /welcome/terms first (tests below, ADR 014).
  const returningGoogleUser = (termsVersion: string | null = TERMS_VERSION) =>
    prisma.user.create({ data: { email: EMAIL, username: 'state_google', name: 'State', googleId: 'g-state', termsVersion } });

  describe('returning from Google', () => {
    it('goes back to the page given as ?next=, and clears the state cookie', async () => {
      await returningGoogleUser();
      const res = await finishGoogleSignIn(app, await startGoogleSignIn(app, '/theses/abc'));

      expect(res.headers.location).toMatch(/\/theses\/abc$/);
      expect(sessionCookieIn(res)).toBeDefined();
      expect(stateCleared(res)).toBe(true);
    });

    it('goes to the dashboard without a ?next=', async () => {
      await returningGoogleUser();
      const res = await finishGoogleSignIn(app, await startGoogleSignIn(app));
      expect(res.headers.location).toMatch(/\/dashboard$/);
    });

    it.each([['//evil.example'], ['https://evil.example'], ['/\\evil.example']])(
      'ignores a ?next= that leaves the site: %s',
      async (next) => {
        await returningGoogleUser();
        const res = await finishGoogleSignIn(app, await startGoogleSignIn(app, next));
        expect(res.headers.location).toMatch(/\/dashboard$/);
      },
    );

    it('a new Google account accepts the Terms first, then carries on to ?next=', async () => {
      const res = await finishGoogleSignIn(app, await startGoogleSignIn(app, '/theses/abc'));
      expect(res.headers.location).toMatch(/\/welcome\/terms\?next=%2Ftheses%2Fabc$/);
      expect(sessionCookieIn(res)).toBeDefined();
    });

    it('an account that accepted an older version of the Terms accepts again', async () => {
      await returningGoogleUser('2000-01-01');
      const res = await finishGoogleSignIn(app, await startGoogleSignIn(app));
      expect(res.headers.location).toMatch(/\/welcome\/terms\?next=%2Fdashboard$/);
    });

    it('the "Google is now how you sign in" notice wins over ?next=', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ acceptedTerms: true, email: EMAIL, password: 'correct-horse-battery', username: 'stateuser', name: 'State' })
        .expect(201);

      const res = await finishGoogleSignIn(app, await startGoogleSignIn(app, '/theses/abc'));

      expect(res.headers.location).toMatch(/\/dashboard\?notice=google-now-sign-in$/);
    });
  });

  describe('refused, with no session and the state cookie cleared', () => {
    const expectRefused = (res: { headers: Record<string, unknown> }) => {
      expect(res.headers.location).toMatch(/\/login\?error=google$/);
      expect(sessionCookieIn(res)).toBeUndefined();
      expect(stateCleared(res)).toBe(true);
    };

    it('without the state cookie (a callback this browser never started)', async () => {
      expectRefused(await finishGoogleSignIn(app, await startGoogleSignIn(app), { cookie: null }));
    });

    it('with a different state', async () => {
      const started = await startGoogleSignIn(app);
      expectRefused(await finishGoogleSignIn(app, started, { state: `${started.state}x` }));
    });

    it("with another sign-in's cookie", async () => {
      const mine = await startGoogleSignIn(app);
      const theirs = await startGoogleSignIn(app);
      expectRefused(await finishGoogleSignIn(app, mine, { cookie: theirs.cookie }));
    });

    it('with an expired cookie', async () => {
      const started = await startGoogleSignIn(app);
      const expired = app.get(JwtService).sign({ typ: 'oauth-state', h: started.state }, { expiresIn: -10 });
      expectRefused(await finishGoogleSignIn(app, started, { cookie: `oauth_state=${expired}` }));
    });

    it('with a session token in place of the state cookie', async () => {
      const started = await startGoogleSignIn(app);
      const session = app.get(JwtService).sign({ sub: 'u1', email: EMAIL, sv: 0, h: started.state });
      expectRefused(await finishGoogleSignIn(app, started, { cookie: `oauth_state=${session}` }));
    });
  });

  it('a state cookie is not a session: refused as session_token, with a 401, not a 500', async () => {
    const { cookie } = await startGoogleSignIn(app);
    const token = cookie.slice('oauth_state='.length);

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', `session_token=${token}`).expect(401);
  });
});
