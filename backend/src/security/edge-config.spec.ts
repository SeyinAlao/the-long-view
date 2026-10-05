import { readFileSync } from 'fs';
import { join } from 'path';
import { readEdgeConfig } from './edge-config';

describe('readEdgeConfig', () => {
  const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] });
  const KEY = 'k'.repeat(32);

  it('refuses to start in production without a key', () => {
    expect(() => readEdgeConfig(config({ NODE_ENV: 'production' }))).toThrow(/EDGE_PROXY_KEY must be set/);
  });

  it('refuses a short key', () => {
    expect(() => readEdgeConfig(config({ EDGE_PROXY_KEY: 'short' }))).toThrow(/at least 32/);
  });

  it('is off without a key outside production', () => {
    expect(readEdgeConfig(config({}))).toEqual({ key: null, enforce: false });
  });

  it('enforces only when told to, and only with a key', () => {
    expect(readEdgeConfig(config({ EDGE_PROXY_KEY: KEY })).enforce).toBe(false);
    expect(readEdgeConfig(config({ EDGE_PROXY_KEY: KEY, EDGE_PROXY_ENFORCE: 'true' })).enforce).toBe(true);
    expect(readEdgeConfig(config({ EDGE_PROXY_ENFORCE: 'true' })).enforce).toBe(false);
  });

  it('render.yaml asks for the key by hand and never commits a value', () => {
    const blueprint = readFileSync(join(__dirname, '..', '..', '..', 'render.yaml'), 'utf8');
    expect(blueprint).toMatch(/- key: EDGE_PROXY_KEY\r?\n\s+sync: false/);
  });
});
