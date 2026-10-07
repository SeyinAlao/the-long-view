import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects registration with a password under 8 characters', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: 'short@example.com', username: 'shortpw', password: '123', name: 'Short' })
      .expect(400);
  });

  // bcrypt ignores every byte past the 72nd (audit F-14), so a longer
  // password would be accepted but only partly checked.
  describe('password length in bytes', () => {
    const register = (password: string, username: string) =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ acceptedTerms: true, email: `${username}@example.com`, username, password, name: 'Bytes' });

    it('accepts exactly 72 bytes', async () => {
      await register('a'.repeat(72), 'bytes72').expect(201);
    });

    it('refuses 73 bytes, saying why', async () => {
      const res = await register('a'.repeat(73), 'bytes73').expect(400);
      expect(res.body.message).toContainEqual(expect.stringContaining('at most 72 bytes'));
    });

    it('counts bytes, not characters: 37 accented letters are 74 bytes', async () => {
      const password = 'é'.repeat(37);
      expect(password).toHaveLength(37);
      await register(password, 'bytesutf8').expect(400);
    });

    it('still signs in an existing account whose password is longer than 72 bytes', async () => {
      const long = 'b'.repeat(80);
      const passwordHash = await bcrypt.hash(long, 10);
      await prisma.user.create({ data: { email: 'long@example.com', username: 'longpw', name: 'Long', passwordHash } });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'long@example.com', password: long })
        .expect(200);
    });
  });

  it('rejects registration with an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: 'not-an-email', username: 'bademail', password: 'correct-horse-battery', name: 'Bad Email' })
      .expect(400);
  });

  it('registers a user, sets a session cookie, and never returns the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true,
        email: 'seyin@example.com',
        username: 'seyin',
        password: 'correct-horse-battery-staple',
        name: 'Seyin Alao',
      })
      .expect(201);

    expect(res.body.user.email).toBe('seyin@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']?.[0]).toMatch(/session_token=/);
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);
  });

  it('rejects a second registration with the same email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: 'dup@example.com', username: 'dupone', password: 'correct-horse-battery', name: 'Dup One' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true, email: 'dup@example.com', username: 'duptwo', password: 'correct-horse-battery', name: 'Dup Two' })
      .expect(409);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true,
        email: 'login@example.com',
        username: 'loginuser',
        password: 'the-real-password',
        name: 'Login User',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' })
      .expect(401);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'the-real-password' })
      .expect(200);

    expect(res.headers['set-cookie']?.[0]).toMatch(/session_token=/);
  });

  it('blocks /auth/me without a session, and allows it with one', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true,
        email: 'me@example.com',
        username: 'meuser',
        password: 'correct-horse-battery',
        name: 'Me User',
      })
      .expect(201);

    const cookie = registerRes.headers['set-cookie'];

    const meRes = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);

    expect(meRes.body.user.email).toBe('me@example.com');
    expect(meRes.body.user).not.toHaveProperty('passwordHash');
  });

  it('logout clears the session so /auth/me is blocked again', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ acceptedTerms: true,
        email: 'logout@example.com',
        username: 'logoutuser',
        password: 'correct-horse-battery',
        name: 'Logout User',
      })
      .expect(201);

    const cookie = registerRes.headers['set-cookie'];

    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(200);
  });
});
