import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
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
      .send({ email: 'short@example.com', username: 'shortpw', password: '123', name: 'Short' })
      .expect(400);
  });

  it('rejects registration with an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', username: 'bademail', password: 'correct-horse-battery', name: 'Bad Email' })
      .expect(400);
  });

  it('registers a user, sets a session cookie, and never returns the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
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
      .send({ email: 'dup@example.com', username: 'dupone', password: 'correct-horse-battery', name: 'Dup One' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', username: 'duptwo', password: 'correct-horse-battery', name: 'Dup Two' })
      .expect(409);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
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
      .send({
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
      .send({
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
