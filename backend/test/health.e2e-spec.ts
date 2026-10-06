import { INestApplication, LoggerService } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// G2 and F-12. With the edge key enforced, as in production: the uptime
// monitor calls these directly, without the key.
const KEY = 'e2e-edge-key-0123456789abcdef0123456789';
const SECRET_DETAIL = 'connect ECONNREFUSED db.internal.example:5432 password=hunter2';

describe('Health checks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const logged: string[] = [];
  const logger: LoggerService = {
    log: () => undefined,
    warn: () => undefined,
    error: (message: string) => void logged.push(String(message)),
  };

  beforeAll(async () => {
    process.env.EDGE_PROXY_KEY = KEY;
    process.env.EDGE_PROXY_ENFORCE = 'true';
    try {
      app = await createTestApp(logger);
    } finally {
      delete process.env.EDGE_PROXY_KEY;
      delete process.env.EDGE_PROXY_ENFORCE;
    }
    prisma = app.get(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(() => app.close());

  it('/health/live answers without the edge key and never touches the database', async () => {
    const query = jest.spyOn(prisma, '$queryRaw');
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });

  it('/health answers without the edge key and checks the database', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.details).toEqual({ database: { status: 'up' } });
  });

  it('/health says only "down" when the database fails, and logs the code, not the message', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValue(Object.assign(new Error(SECRET_DETAIL), { code: 'P1001' }));
    const res = await request(app.getHttpServer()).get('/health').expect(503);

    expect(res.body.details).toEqual({ database: { status: 'down' } });
    for (const detail of ['ECONNREFUSED', 'db.internal', 'hunter2']) {
      expect(res.text).not.toContain(detail);
      expect(logged.join('\n')).not.toContain(detail);
    }
    expect(logged).toContainEqual(expect.stringContaining('health_database_down error=Error code=P1001'));
  });
});
