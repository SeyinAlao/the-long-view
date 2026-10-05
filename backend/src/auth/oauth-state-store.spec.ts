import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Strategy as OAuth2Strategy, type StateStore } from 'passport-oauth2';
import { OAUTH_STATE_COOKIE, SignedCookieStateStore } from './oauth-state-store';

// Runs the real passport-oauth2 (pinned 1.8.0) with the store, so a
// library change to how it calls a state store fails here, not in
// production: arity-based dispatch, the object-vs-string state rule, and
// the verified state reaching `info.state`.
describe('SignedCookieStateStore with the real passport-oauth2', () => {
  const jwt = new JwtService({ secret: 'unit-test-secret' });
  const store = new SignedCookieStateStore(jwt, false);

  type Spied = OAuth2Strategy & Record<'redirect' | 'success' | 'fail' | 'error', jest.Mock>;
  const strategy = (): Spied => {
    const s = new OAuth2Strategy(
      {
        authorizationURL: 'https://accounts.example/authorize',
        tokenURL: 'https://accounts.example/token',
        clientID: 'client',
        clientSecret: 'secret',
        callbackURL: 'https://app.example/api/auth/google/callback',
        store: store as unknown as StateStore,
        skipUserProfile: true,
      },
      (_access: string, _refresh: string, _profile: unknown, done: (e: null, user: object) => void) => done(null, { id: 'u1' }),
    ) as Spied;
    for (const method of ['redirect', 'success', 'fail', 'error'] as const) s[method] = jest.fn();
    return s;
  };
  const startRequest = () => ({ query: {}, res: { cookie: jest.fn() } }) as unknown as Request & { res: { cookie: jest.Mock } };

  const start = (state: unknown) => {
    const s = strategy();
    const req = startRequest();
    s.authenticate(req, { state } as object);
    return { req, url: new URL(s.redirect.mock.calls[0][0] as string) };
  };

  it('is called in the 4- and 3-argument forms 1.8.0 dispatches on', () => {
    expect(store.store.length).toBe(4);
    expect(store.verify.length).toBe(3);
  });

  it('an object state goes through the store: a random handle to Google, the cookie to the browser', () => {
    const { req, url } = start({ next: '/theses/abc' });

    const handle = url.searchParams.get('state')!;
    expect(handle).toMatch(/^[\w-]{32}$/);
    const [name, token, options] = req.res.cookie.mock.calls[0];
    expect(name).toBe(OAUTH_STATE_COOKIE);
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 600_000 });
    expect(jwt.verify(token)).toMatchObject({ typ: 'oauth-state', h: handle, next: '/theses/abc' });
  });

  // Why GoogleAuthGuard always passes an object: a string state is sent
  // to Google as it is, the store is never called, and nothing is checked.
  it('a string state skips the store entirely', () => {
    const { req, url } = start('plain-string');

    expect(url.searchParams.get('state')).toBe('plain-string');
    expect(req.res.cookie).not.toHaveBeenCalled();
  });

  describe('on the callback', () => {
    const callback = (query: Record<string, string>, cookie?: string) => {
      const s = strategy();
      jest.spyOn((s as unknown as { _oauth2: { getOAuthAccessToken: () => void } })._oauth2, 'getOAuthAccessToken')
        .mockImplementation((...args: unknown[]) => (args[2] as (...r: unknown[]) => void)(null, 'access', 'refresh', {}));
      const req = { query, cookies: cookie ? { [OAUTH_STATE_COOKIE]: cookie } : {} } as unknown as Request;
      s.authenticate(req, {});
      return s;
    };
    const issued = () => {
      const { req, url } = start({ next: '/theses/abc' });
      return { handle: url.searchParams.get('state')!, cookie: req.res.cookie.mock.calls[0][1] as string };
    };

    it('the matching state signs in, and its `next` reaches info.state', () => {
      const { handle, cookie } = issued();
      const s = callback({ code: 'c', state: handle }, cookie);

      expect(s.success).toHaveBeenCalledWith({ id: 'u1' }, { state: { next: '/theses/abc' } });
    });

    it.each([
      ['a different state', (h: string, c: string) => ({ q: { code: 'c', state: `${h}x` }, c })],
      ['no state', (_h: string, c: string) => ({ q: { code: 'c' }, c })],
      ['no cookie', (h: string) => ({ q: { code: 'c', state: h }, c: undefined })],
    ])('refuses %s, before any token exchange', (_label, make) => {
      const { handle, cookie } = issued();
      const { q, c } = make(handle, cookie);
      const s = callback(q, c);

      expect(s.fail).toHaveBeenCalled();
      expect(s.success).not.toHaveBeenCalled();
    });

    it('refuses an expired cookie', () => {
      const expired = jwt.sign({ typ: 'oauth-state', h: 'handle' }, { expiresIn: -10 });
      expect(callback({ code: 'c', state: 'handle' }, expired).fail).toHaveBeenCalled();
    });

    it('refuses a token that is not a state cookie (a session token)', () => {
      const session = jwt.sign({ sub: 'u1', email: 'a@example.com', sv: 0, h: 'handle' });
      expect(callback({ code: 'c', state: 'handle' }, session).fail).toHaveBeenCalled();
    });

    it('refuses a cookie signed with another secret', () => {
      const forged = new JwtService({ secret: 'other' }).sign({ typ: 'oauth-state', h: 'handle' });
      expect(callback({ code: 'c', state: 'handle' }, forged).fail).toHaveBeenCalled();
    });
  });
});
