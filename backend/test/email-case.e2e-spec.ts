import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// One email address is one account, whatever letter case it's typed in.
describe('Email letter case (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const register = (email: string, username: string) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email, username, password: 'correct-horse-battery', name: 'Ana Bello' });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the email lowercased and signs in with any case or stray spaces', async () => {
    const res = await register('Ana.Bello@Example.COM', 'anabello').expect(201);
    expect(res.body.user.email).toBe('ana.bello@example.com');

    for (const email of ['ana.bello@example.com', '  ANA.BELLO@example.com ']) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'correct-horse-battery' })
        .expect(200);
    }
  });

  it('refuses a second account for the same email in a different case', async () => {
    await register('ana@example.com', 'anaone').expect(201);
    await register('ANA@Example.com', 'anatwo').expect(409);
  });

  // Records how the database driver compares a lookup against the citext
  // column, for a row stored in mixed case behind the app's back (the
  // migration lowercases every existing row, so the app never depends on
  // this). If a driver or Prisma upgrade flips it, this test says so.
  it('documents: a mixed-case row written outside the app is still found by citext', async () => {
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    await prisma.$executeRaw`INSERT INTO "User" (id, email, username, name, "passwordHash", "updatedAt")
      VALUES ('legacy_1', 'Legacy@Example.com', 'legacy', 'Legacy', ${passwordHash}, now())`;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'legacy@example.com', password: 'correct-horse-battery' })
      .expect(200);
  });
});
