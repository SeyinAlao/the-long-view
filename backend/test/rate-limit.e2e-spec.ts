import { INestApplication, LoggerService } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACCOUNT_FAILURES, RATE_LIMITS } from '../src/security/rate-limits';
import { createTestApp } from './create-test-app';

// Rate limiting and the edge key (ADR 010), with the key enforced as in
// production. Every limit counts the client IP the frontend vouched for
// (x-tlv-client-ip, with the edge key) and nothing a caller says about
// itself: X-Forwarded-For and X-Real-IP are never read.
const KEY = 'e2e-edge-key-0123456789abcdef0123456789';
const PASSWORD = 'correct-horse-battery-staple';

class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  log = (m: unknown) => void this.lines.push(String(m));
  error = (m: unknown) => void this.lines.push(String(m));
  warn = (m: unknown) => void this.lines.push(String(m));
  debug = (m: unknown) => void this.lines.push(String(m));
  verbose = (m: unknown) => void this.lines.push(String(m));
}

const edge = (clientIp?: string) => ({
  'x-tlv-edge-key': KEY,
  ...(clientIp ? { 'x-tlv-client-ip': clientIp } : {}),
});

async function startApp(enforce: boolean, logger: LoggerService) {
  process.env.EDGE_PROXY_KEY = KEY;
  process.env.EDGE_PROXY_ENFORCE = enforce ? 'true' : 'false';
  try {
    return await createTestApp(logger);
  } finally {
    delete process.env.EDGE_PROXY_KEY;
    delete process.env.EDGE_PROXY_ENFORCE;
  }
}

describe('Rate limits, with the edge key enforced (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const logger = new CapturingLogger();
  const login = (headers: Record<string, string>, email: string, password = 'wrong-password') =>
    request(app.getHttpServer()).post('/auth/login').set(headers).send({ email, password });

  beforeAll(async () => {
    app = await startApp(true, logger);
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('the edge key', () => {
    it('refuses a request without it, or with the wrong one', async () => {
      await request(app.getHttpServer()).get('/leaderboard').expect(403);
      await request(app.getHttpServer()).get('/leaderboard').set('x-tlv-edge-key', 'x'.repeat(KEY.length)).expect(403);
      await request(app.getHttpServer()).get('/leaderboard').set(edge()).expect(200);
    });

    it('lets the health check through without it', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).not.toBe(403);
    });
  });

  describe('per IP', () => {
    it('a faked X-Forwarded-For or X-Real-IP does not reset the count', async () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await login({ ...edge('198.51.100.1'), 'x-forwarded-for': `10.0.0.${i}`, 'x-real-ip': `10.1.0.${i}` }, `p${i}@example.com`).expect(401);
      }
      const refused = await login(
        { ...edge('198.51.100.1'), 'x-forwarded-for': '10.9.9.9', 'x-real-ip': '10.9.9.8' },
        'another@example.com',
      ).expect(429);
      expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
      expect(refused.body.message).toBe('Too many attempts. Try again in 15 minutes.');

      // A different client, as the frontend reports it, has its own count.
      await login(edge('198.51.100.2'), 'another@example.com').expect(401);
    });

    it('a client-ip header without the key counts for nothing: it never gets in', async () => {
      await request(app.getHttpServer()).post('/auth/login').set('x-tlv-client-ip', '198.51.100.3').send({}).expect(403);
    });

    it('server-side fetches (the key, no client IP) are not limited per IP', async () => {
      for (let i = 0; i <= RATE_LIMITS.login.limit; i++) {
        await login(edge(), `s${i}@example.com`).expect(401);
      }
    });

    it('counts an IPv6 client by its /64', async () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await login(edge(`2001:db8:5:6::${(i + 1).toString(16)}`), `v${i}@example.com`).expect(401);
      }
      await login(edge('2001:db8:5:6:ffff::1'), 'v-last@example.com').expect(429);
    });
  });

  describe('per account', () => {
    it('refuses an email after too many failures from any IPs, even with the right password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set(edge())
        .send({ email: 'ada@example.com', username: 'ada', password: PASSWORD, name: 'Ada' })
        .expect(201);

      for (let i = 0; i < ACCOUNT_FAILURES.limit; i++) {
        await login(edge(`198.51.101.${i}`), 'ada@example.com').expect(401);
      }
      const refused = await login(edge('198.51.101.200'), 'ada@example.com', PASSWORD).expect(429);
      // Same words as for an email with no account: a 429 says nothing about who exists.
      for (let i = 0; i < ACCOUNT_FAILURES.limit; i++) {
        await login(edge(`198.51.102.${i}`), 'nobody@example.com').expect(401);
      }
      const unknown = await login(edge('198.51.102.200'), 'nobody@example.com').expect(429);
      expect(unknown.body).toEqual(refused.body);

      // Another account from the same IP is unaffected.
      await login(edge('198.51.101.200'), 'bea@example.com').expect(401);
    });

    it('a successful sign-in clears the failures', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set(edge())
        .send({ email: 'cleo@example.com', username: 'cleo', password: PASSWORD, name: 'Cleo' })
        .expect(201);
      for (let i = 0; i < ACCOUNT_FAILURES.limit - 1; i++) await login(edge(), 'cleo@example.com').expect(401);
      await login(edge(), 'cleo@example.com', PASSWORD).expect(200);
      for (let i = 0; i < ACCOUNT_FAILURES.limit - 1; i++) await login(edge(), 'cleo@example.com').expect(401);
      await login(edge(), 'cleo@example.com', PASSWORD).expect(200);
    });
  });

  describe('Google sign-in, throttled', () => {
    it.each([['/auth/google'], ['/auth/google/callback?code=c&state=s']])(
      '%s sends the person to /login with a message, not JSON',
      async (path) => {
        const ip = path.includes('callback') ? '198.51.103.2' : '198.51.103.1';
        for (let i = 0; i < RATE_LIMITS.google.limit; i++) {
          const res = await request(app.getHttpServer()).get(path).set(edge(ip)).expect(302);
          expect(res.headers.location).not.toContain('google-busy');
        }
        const refused = await request(app.getHttpServer()).get(path).set(edge(ip)).expect(302);
        expect(refused.headers.location).toBe('http://localhost:3000/login?error=google-busy');
        expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
      },
    );
  });

  describe('what is logged', () => {
    it('failures and throttles, by ref only: no email, password, token or IP', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set(edge())
        .send({ email: 'dana.secret@example.com', username: 'dana', password: PASSWORD, name: 'Dana' })
        .expect(201);
      const signedIn = await login(edge('198.51.104.1'), 'dana.secret@example.com', PASSWORD).expect(200);
      const token = /session_token=([^;]+)/.exec(String(signedIn.headers['set-cookie']))![1];
      for (let i = 0; i <= ACCOUNT_FAILURES.limit; i++) {
        await login(edge('198.51.104.1'), 'dana.secret@example.com', 'hunter2-wrong-pass');
      }
      await request(app.getHttpServer()).get('/auth/me').set(edge()).set('Cookie', `session_token=${token}x`).expect(401);
      await request(app.getHttpServer()).get('/leaderboard').expect(403);

      const text = logger.lines.join('\n');
      expect(text).toMatch(/auth_login_failed reason=bad_password acctRef=[0-9a-f]{12} ipRef=[0-9a-f]{12}/);
      expect(text).toMatch(/auth_throttled scope=account policy=login/);
      expect(text).toContain('auth_session_rejected reason=bad_token');
      expect(text).toContain('edge_unverified area=leaderboard');
      for (const secret of ['dana.secret', 'example.com', 'hunter2-wrong-pass', PASSWORD, token, '198.51.104.1', KEY]) {
        expect(text).not.toContain(secret);
      }
    });
  });
});

describe('Rate limits, before the edge key is enforced (e2e)', () => {
  let app: INestApplication;
  const logger = new CapturingLogger();

  beforeAll(async () => {
    app = await startApp(false, logger);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a request without the key through, logs it, and believes none of its headers', async () => {
    for (let i = 0; i <= RATE_LIMITS.login.limit; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set({ 'x-tlv-client-ip': '198.51.105.1', 'x-forwarded-for': '198.51.105.1' })
        .send({ email: `o${i}@example.com`, password: 'wrong-password' })
        .expect(401);
    }
    expect(logger.lines).toContain('edge_unverified area=auth');
  });
});
