import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy';

// Google sign-in may join an existing account by email (ADR 003), so it
// only accepts an address Google says it has verified.
describe('GoogleStrategy.validate', () => {
  const config = { getOrThrow: (key: string) => `test-${key}` } as unknown as ConfigService;
  const strategy = new GoogleStrategy(config);

  const profileWith = (email: { value: string; verified?: boolean }) =>
    ({ id: 'g-1', displayName: 'Ana Bello', emails: [email] }) as unknown as Profile;

  const run = (profile: Profile) =>
    new Promise<{ error: unknown; user: unknown }>((resolve) =>
      strategy.validate('access', 'refresh', profile, (error, user) => resolve({ error, user })),
    );

  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('accepts an email Google has verified', async () => {
    const { user } = await run(profileWith({ value: 'ana@example.com', verified: true }));
    expect(user).toEqual({ googleId: 'g-1', email: 'ana@example.com', name: 'Ana Bello' });
  });

  it('refuses an email Google says is not verified', async () => {
    const { error, user } = await run(profileWith({ value: 'ana@example.com', verified: false }));
    expect(error).toBeNull();
    expect(user).toBe(false);
  });

  it('refuses when Google sends no verified flag at all', async () => {
    const { user } = await run(profileWith({ value: 'ana@example.com' }));
    expect(user).toBe(false);
  });

  it('logs the refusal without the email', async () => {
    await run(profileWith({ value: 'ana@example.com', verified: false }));
    expect(Logger.prototype.warn).toHaveBeenCalledWith('google_sign_in_refused reason=email_not_verified');
  });
});
