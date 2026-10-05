import type { ConfigService } from '@nestjs/config';

// Test-only: the browser tests point Google sign-in at a fake Google on
// this machine (e2e/support/fake-google.mjs). Unset everywhere else, and
// render.yaml never defines them (a unit test checks). If any is set, the
// API refuses to start unless NODE_ENV isn't production and every one
// points at 127.0.0.1 - so a slip can't send sign-ins anywhere else.
const OVERRIDES = {
  GOOGLE_AUTHORIZATION_URL: 'authorizationURL',
  GOOGLE_TOKEN_URL: 'tokenURL',
  GOOGLE_USERINFO_URL: 'userProfileURL',
} as const;

type Endpoints = Partial<Record<(typeof OVERRIDES)[keyof typeof OVERRIDES], string>>;

export function googleEndpoints(config: Pick<ConfigService, 'get'>): Endpoints {
  const endpoints: Endpoints = {};
  for (const [variable, option] of Object.entries(OVERRIDES)) {
    const value = config.get<string>(variable);
    if (!value) continue;
    if (config.get<string>('NODE_ENV') === 'production') {
      throw new Error(`${variable} is for tests only and must not be set in production.`);
    }
    if (new URL(value).hostname !== '127.0.0.1') {
      throw new Error(`${variable} must point at 127.0.0.1 (a local fake Google for tests).`);
    }
    endpoints[option] = value;
  }
  return endpoints;
}
