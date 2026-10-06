import { test, expect } from '../support/fixtures';
import { contentSecurityPolicy, pageSecurityHeaders } from '../../frontend/security-headers';
import nextConfig from '../../frontend/next.config';

// The security headers (ADR 011) as a browser receives them, through
// the frontend (next start, as on Vercel) and its /api rewrite.
const PAGE_POLICY = contentSecurityPolicy({ development: false, onVercel: false });
const API_POLICY = "default-src 'none'; frame-ancestors 'none'";

test.describe('the policy itself', () => {
  test("allows eval only in development, and upgrades requests only on Vercel", () => {
    expect(PAGE_POLICY).not.toContain('unsafe-eval');
    expect(contentSecurityPolicy({ development: true, onVercel: false })).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(PAGE_POLICY).not.toContain('upgrade-insecure-requests');
    expect(contentSecurityPolicy({ development: false, onVercel: true })).toContain('upgrade-insecure-requests');
  });

  test('CSP_REPORT_ONLY=true sends the same policy as Report-Only', () => {
    const names = (env: Record<string, string>) => pageSecurityHeaders(env as NodeJS.ProcessEnv).map((h) => h.key);
    expect(names({})).toContain('Content-Security-Policy');
    expect(names({ CSP_REPORT_ONLY: 'true' })).toContain('Content-Security-Policy-Report-Only');
    expect(names({ CSP_REPORT_ONLY: 'true' })).not.toContain('Content-Security-Policy');
  });
});

for (const path of ['/', '/login', '/feed', '/leaderboard', '/no-such-page']) {
  test(`${path} sends the page headers`, async ({ request }) => {
    const res = await request.get(path);
    const headers = res.headers();
    expect(headers['content-security-policy']).toBe(PAGE_POLICY);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['x-powered-by']).toBeUndefined();
  });
}

// The rule that stops Vercel's CDN caching API responses (per-person
// data). Read from the config, not a response: next start doesn't apply
// next.config headers to a rewrite to another host, so the header never
// shows locally (checked 6 October); on Vercel it is a CDN directive,
// checked live in docs/deployment.md's verification checklist.
test('next.config keeps the /api no-caching rule, and the page headers stay off /api', async () => {
  const rules = await nextConfig.headers!();
  const api = rules.find((rule) => rule.source === '/api/:path*');
  expect(api?.headers).toContainEqual({ key: 'x-vercel-enable-rewrite-caching', value: '0' });
  const pages = rules.find((rule) => rule.headers.some((h) => h.key.startsWith('Content-Security-Policy')));
  expect(pages?.source).toBe('/((?!api/).*)');
  expect(new RegExp(`^${pages!.source}$`).test('/api/leaderboard')).toBe(false);
  expect(new RegExp(`^${pages!.source}$`).test('/feed')).toBe(true);
});

test("/api responses carry the API's own headers, not the page policy", async ({ request }) => {
  const res = await request.get('/api/leaderboard');
  expect(res.status()).toBe(200);
  const headers = res.headers();
  expect(headers['cache-control']).toBe('no-store');
  expect(headers['content-security-policy']).toBe(API_POLICY);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();
});
