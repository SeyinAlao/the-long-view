import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

// Audit F-15: GET /theses's paging parameters are validated, so nonsense
// is a clear 400, never a 500 or a page counted backwards.
describe('GET /theses paging (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  const get = (query: string) => request(app.getHttpServer()).get(`/theses${query}`);

  it.each(['?take=abc', '?skip=abc', '?take=-5', '?skip=-1', '?take=0', '?take=2.5', '?take=51', '?skip=10001'])(
    'refuses %s with a 400',
    async (query) => {
      await get(query).expect(400);
    },
  );

  it.each(['', '?take=10', '?skip=0&take=50', '?ticker=MTNN'])('accepts %p', async (query) => {
    const res = await get(query).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
