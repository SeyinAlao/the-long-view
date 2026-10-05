import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

export interface StubbedGoogleProfile {
  id: string;
  email: string;
  verified?: boolean | string;
}

// Replaces only Google's two network calls on the real strategy - the
// code-for-token exchange and the profile fetch - so a request to
// /auth/google/callback?code=... runs everything else for real: Passport,
// GoogleStrategy.validate, the guard, the controller and the database.
// The profile has the shape passport-google-oauth20 builds from Google's
// userinfo (email_verified becomes emails[0].verified).
export function stubGoogle(app: INestApplication, profile: StubbedGoogleProfile): void {
  const strategy = app.get(GoogleStrategy) as unknown as {
    _oauth2: { getOAuthAccessToken: (...args: unknown[]) => void };
    userProfile: (token: string, done: (err: unknown, profile?: unknown) => void) => void;
  };

  jest.spyOn(strategy._oauth2, 'getOAuthAccessToken').mockImplementation((...args: unknown[]) => {
    const callback = args[2] as (err: unknown, access: string, refresh: string, params: object) => void;
    callback(null, 'stub-access-token', 'stub-refresh-token', {});
  });
  jest.spyOn(strategy, 'userProfile').mockImplementation((_token, done) => {
    const email = profile.verified === undefined ? { value: profile.email } : { value: profile.email, verified: profile.verified };
    done(null, { provider: 'google', id: profile.id, displayName: 'Google Person', emails: [email] });
  });
}

export interface StartedGoogleSignIn {
  location: URL; // where the API sent the browser: Google's authorize URL
  stateCookie: string; // the full Set-Cookie line for oauth_state
  cookie: string; // "oauth_state=..." as a browser would send it back
  state: string; // the state Google would hand back
}

// GET /auth/google, as a browser starting Google sign-in.
export async function startGoogleSignIn(app: INestApplication, next?: string): Promise<StartedGoogleSignIn> {
  const res = await request(app.getHttpServer())
    .get(`/auth/google${next === undefined ? '' : `?next=${encodeURIComponent(next)}`}`)
    .expect(302);
  const stateCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('oauth_state='))!;
  const location = new URL(res.headers.location);
  return { location, stateCookie, cookie: stateCookie.split(';')[0], state: location.searchParams.get('state')! };
}

// Google's redirect back, carrying the state and (by default) the cookie
// from startGoogleSignIn. stubGoogle must have been called first.
export function finishGoogleSignIn(app: INestApplication, started: StartedGoogleSignIn, options: { state?: string; cookie?: string | null } = {}) {
  const req = request(app.getHttpServer()).get(
    `/auth/google/callback?code=stub-code&state=${encodeURIComponent(options.state ?? started.state)}`,
  );
  const cookie = options.cookie === undefined ? started.cookie : options.cookie;
  return (cookie ? req.set('Cookie', cookie) : req).expect(302);
}

// The whole round trip, for tests where the state is not the point.
export async function signInWithGoogle(app: INestApplication, next?: string) {
  return finishGoogleSignIn(app, await startGoogleSignIn(app, next));
}
