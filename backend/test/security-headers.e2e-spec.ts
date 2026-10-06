import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API_SECURITY_HEADERS } from '../src/security/security-headers.middleware';
import { RATE_LIMITS } from '../src/security/rate-limits';
import { createTestApp } from './create-test-app';

// The API's security headers (ADR 011) on every kind of response it
// gives: data, a refusal before routing (the edge check's 403), a 429,
// an error and a redirect. With the edge key enforced, as in production.
const KEY = 'e2e-edge-key-0123456789abcdef0123456789';

describe('API security headers (e2e)', () => {
  let app: INestApplication;
  const edge = (clientIp?: string) => ({
    'x-tlv-edge-key': KEY,
    ...(clientIp ? { 'x-tlv-client-ip': clientIp } : {}),
  });

  beforeAll(async () => {
    process.env.EDGE_PROXY_KEY = KEY;
    process.env.EDGE_PROXY_ENFORCE = 'true';
    try {
      app = await createTestApp();
    } finally {
      delete process.env.EDGE_PROXY_KEY;
      delete process.env.EDGE_PROXY_ENFORCE;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const expectHeaders = (res: request.Response) => {
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
      if (name === 'Cache-Control') continue;
      expect(res.headers[name.toLowerCase()]).toBe(value);
    }
    // Exactly no-store, except /health, where @nestjs/terminus sets the
    // stricter "no-cache, no-store, must-revalidate" itself.
    expect(res.headers['cache-control']).toMatch(/(^|, )no-store(,|$)/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  };

  it('on data', async () => {
    expectHeaders(await request(app.getHttpServer()).get('/leaderboard').set(edge()).expect(200));
  });

  it("on the edge check's 403, before any route runs", async () => {
    expectHeaders(await request(app.getHttpServer()).get('/leaderboard').expect(403));
  });

  it('on the health check', async () => {
    expectHeaders(await request(app.getHttpServer()).get('/health'));
  });

  it('on a 401 and a 404', async () => {
    expectHeaders(await request(app.getHttpServer()).get('/auth/me').set(edge()).expect(401));
    expectHeaders(await request(app.getHttpServer()).get('/no-such-route').set(edge()).expect(404));
  });

  it('on a 429', async () => {
    for (let i = 0; i < RATE_LIMITS.register.limit; i++) {
      await request(app.getHttpServer()).post('/auth/register').set(edge('198.51.110.1')).send({});
    }
    expectHeaders(await request(app.getHttpServer()).post('/auth/register').set(edge('198.51.110.1')).send({}).expect(429));
  });

  it('on the redirect to Google', async () => {
    expectHeaders(await request(app.getHttpServer()).get('/auth/google').set(edge()).expect(302));
  });
});
