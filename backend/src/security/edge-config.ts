import type { ConfigService } from '@nestjs/config';

// The shared secret the frontend sends with every request it forwards
// (ADR 010). With it, the API can trust the client IP the frontend read
// from Vercel; without it, nothing the request says about its own IP is
// believed.
//
// - Unset: development and tests only. No per-IP limits.
// - Set, EDGE_PROXY_ENFORCE not "true": requests without the key are let
//   through and logged (edge_unverified), for checking a deploy.
// - Set, EDGE_PROXY_ENFORCE "true": requests without the key get 403,
//   apart from /health, which the uptime monitor calls directly.
export type EdgeConfig = { key: Buffer | null; enforce: boolean };

const MIN_KEY_LENGTH = 32;

export function readEdgeConfig(config: Pick<ConfigService, 'get'>): EdgeConfig {
  const key = config.get<string>('EDGE_PROXY_KEY') || null;
  const production = config.get<string>('NODE_ENV') === 'production';
  if (!key && production) {
    throw new Error('EDGE_PROXY_KEY must be set in production (docs/deployment.md, "The edge key").');
  }
  if (key && key.length < MIN_KEY_LENGTH) {
    throw new Error(`EDGE_PROXY_KEY must be at least ${MIN_KEY_LENGTH} characters.`);
  }
  return {
    key: key ? Buffer.from(key) : null,
    enforce: Boolean(key) && config.get<string>('EDGE_PROXY_ENFORCE') === 'true',
  };
}
