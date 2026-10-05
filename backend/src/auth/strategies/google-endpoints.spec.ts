import { readFileSync } from 'fs';
import { join } from 'path';
import { googleEndpoints } from './google-endpoints';

describe('googleEndpoints (test-only Google overrides)', () => {
  const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] });

  it('changes nothing when none is set', () => {
    expect(googleEndpoints(config({ NODE_ENV: 'production' }))).toEqual({});
  });

  it('maps local overrides to the strategy options', () => {
    expect(
      googleEndpoints(
        config({
          GOOGLE_AUTHORIZATION_URL: 'http://127.0.0.1:4200/o/oauth2/v2/auth',
          GOOGLE_TOKEN_URL: 'http://127.0.0.1:4200/token',
          GOOGLE_USERINFO_URL: 'http://127.0.0.1:4200/userinfo',
        }),
      ),
    ).toEqual({
      authorizationURL: 'http://127.0.0.1:4200/o/oauth2/v2/auth',
      tokenURL: 'http://127.0.0.1:4200/token',
      userProfileURL: 'http://127.0.0.1:4200/userinfo',
    });
  });

  it('refuses any override in production', () => {
    expect(() =>
      googleEndpoints(config({ NODE_ENV: 'production', GOOGLE_TOKEN_URL: 'http://127.0.0.1:4200/token' })),
    ).toThrow(/must not be set in production/);
  });

  it.each([['http://localhost:4200/token'], ['https://oauth2.example.com/token'], ['http://127.0.0.2/token']])(
    'refuses a host other than 127.0.0.1: %s',
    (url) => {
      expect(() => googleEndpoints(config({ GOOGLE_TOKEN_URL: url }))).toThrow(/must point at 127\.0\.0\.1/);
    },
  );

  it('render.yaml never defines them', () => {
    const blueprint = readFileSync(join(__dirname, '..', '..', '..', '..', 'render.yaml'), 'utf8');
    for (const name of ['GOOGLE_AUTHORIZATION_URL', 'GOOGLE_TOKEN_URL', 'GOOGLE_USERINFO_URL']) {
      expect(blueprint).not.toContain(name);
    }
  });
});
