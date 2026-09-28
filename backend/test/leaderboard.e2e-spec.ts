import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// This suite is about ranking, not about registering or publishing —
// those flows have their own suites. So it creates its rows directly
// instead of walking through the API for each one. That's not just
// tidier: against a remote database every extra request is several
// round trips, and the first version of this test (register, create,
// publish, per author) timed out for exactly that reason.
describe('Leaderboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let securityIds: string[];

  function seedAuthor(username: string, extra: { email?: string; passwordHash?: string } = {}) {
    return prisma.user.create({
      data: {
        email: extra.email ?? `${username}@example.com`,
        username,
        name: `${username} name`,
        passwordHash: extra.passwordHash,
      },
    });
  }

  // A thesis that has already been graded: the row the leaderboard reads.
  async function seedGradedThesis(authorId: string, securityId: string, outcomeScore: number) {
    const thesis = await prisma.thesis.create({
      data: {
        authorId,
        securityId,
        status: 'EVALUATED',
        referencePrice: 100,
        targetPrice: 120,
        conviction: 8,
        horizonDays: 180,
        statement:
          'Pricing power is returning to the leader and the next six months should reward patience as distribution strength compounds over time.',
        publishedAt: new Date(),
      },
    });
    await prisma.thesisOutcome.create({
      data: { thesisId: thesis.id, evaluationPrice: 110, targetReturn: 0.2, actualReturn: 0.1, outcomeScore },
    });
  }

  // Order matters: everything that points at Thesis goes before Thesis,
  // and Thesis before User. Runs before AND after each test, so a test
  // never depends on whatever an earlier run left behind.
  async function clearDatabase() {
    await prisma.thesisMetric.deleteMany({ where: {} });
    await prisma.counterThesis.deleteMany({ where: {} });
    await prisma.thesisOutcome.deleteMany({ where: {} });
    await prisma.thesis.deleteMany({ where: {} });
    await prisma.user.deleteMany();
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    // Any two seeded securities will do — the leaderboard doesn't care
    // which company a call was about.
    securityIds = (await prisma.security.findMany({ take: 2 })).map((s) => s.id);
  });

  beforeEach(clearDatabase);
  afterEach(clearDatabase);

  afterAll(async () => {
    await app.close();
  });

  it('is an empty list, not an error, when nothing has been evaluated yet', async () => {
    const res = await request(app.getHttpServer()).get('/leaderboard').expect(200);
    expect(res.body).toEqual([]);
  });

  it('ranks authors by cumulative score using real stored outcomes, with no login required', async () => {
    const oneCall = await seedAuthor('leaderone');
    const twoCalls = await seedAuthor('leadertwo');

    await seedGradedThesis(oneCall.id, securityIds[0], 5); // leaderone: total 5
    await seedGradedThesis(twoCalls.id, securityIds[0], 6);
    await seedGradedThesis(twoCalls.id, securityIds[1], 3); // leadertwo: total 9, two calls

    const res = await request(app.getHttpServer()).get('/leaderboard').expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      rank: 1,
      author: { username: 'leadertwo' },
      evaluatedCount: 2,
      totalScore: 9,
      averageScore: 4.5,
      hitRate: 1,
    });
    expect(res.body[1]).toMatchObject({ rank: 2, author: { username: 'leaderone' }, totalScore: 5 });
  });

  it('never leaks anything about an author beyond id, username and name', async () => {
    const author = await seedAuthor('privateauthor', {
      email: 'private@example.com',
      passwordHash: 'a-hash-that-must-never-appear',
    });
    await seedGradedThesis(author.id, securityIds[0], 4);

    const res = await request(app.getHttpServer()).get('/leaderboard').expect(200);
    const serialized = JSON.stringify(res.body);

    expect(serialized).not.toContain('a-hash-that-must-never-appear');
    expect(serialized).not.toContain('private@example.com');
    expect(Object.keys(res.body[0].author).sort()).toEqual(['id', 'name', 'username']);
  });
});
