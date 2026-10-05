import { INestApplication } from '@nestjs/common';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

export interface StubbedGoogleProfile {
  id: string;
  email: string;
  verified?: boolean;
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
