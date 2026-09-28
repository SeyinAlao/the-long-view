import { LeaderboardService, rankAuthors, type OutcomeRow } from './leaderboard.service';
import type { PrismaService } from '../prisma/prisma.service';

const author = (id: string) => ({ id, username: id, name: id.toUpperCase() });

function row(id: string, outcomeScore: number, targetReturn = 0.2, actualReturn = 0.1): OutcomeRow {
  return { outcomeScore, targetReturn, actualReturn, author: author(id) };
}

describe('rankAuthors', () => {
  it('ranks by cumulative score, and computes count, average and hit rate by hand-checkable numbers', () => {
    const ranked = rankAuthors([
      row('alice', 10, 0.2, 0.1), // right direction
      row('alice', -2, 0.2, -0.1), // wrong direction
      row('bob', 8, -0.2, -0.1), // bearish call, went down: right direction
      row('carol', 20, 0.2, 0.3),
    ]);

    expect(ranked.map((e) => e.author.id)).toEqual(['carol', 'alice', 'bob']);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);

    const alice = ranked[1];
    expect(alice.evaluatedCount).toBe(2);
    expect(alice.totalScore).toBe(8); // 10 + -2
    expect(alice.averageScore).toBe(4); // 8 / 2
    expect(alice.hitRate).toBe(0.5); // 1 hit out of 2
  });

  it('breaks a tied total score by more evaluated calls, not by chance', () => {
    const ranked = rankAuthors([
      row('bob', 8), // total 8, one call
      row('alice', 5),
      row('alice', 3), // total 8, two calls
    ]);
    expect(ranked.map((e) => e.author.id)).toEqual(['alice', 'bob']);
  });

  it('breaks a full tie alphabetically so the order is always deterministic', () => {
    const ranked = rankAuthors([row('zed', 5), row('amy', 5)]);
    expect(ranked.map((e) => e.author.id)).toEqual(['amy', 'zed']);
  });

  it('never counts a flat call (no predicted direction) as a hit', () => {
    const [entry] = rankAuthors([row('dave', 0, 0, 0.1)]);
    expect(entry.hitRate).toBe(0);
  });

  it('keeps floating-point noise out of the totals (0.1 + 0.2 is 0.3, not 0.30000000000000004)', () => {
    const [entry] = rankAuthors([row('erin', 0.1), row('erin', 0.2)]);
    expect(entry.totalScore).toBe(0.3);
  });

  it('returns an empty list when nothing has been evaluated yet', () => {
    expect(rankAuthors([])).toEqual([]);
  });

  it('caps the board at 50 entries and keeps the highest scores', () => {
    const many = Array.from({ length: 60 }, (_, i) => row(`author${i}`, i));
    const ranked = rankAuthors(many);
    expect(ranked).toHaveLength(50);
    expect(ranked[0].author.id).toBe('author59');
    expect(ranked[49].rank).toBe(50);
  });
});

describe('LeaderboardService.getLeaderboard', () => {
  it('turns stored Decimal-style values into numbers and ranks the result', async () => {
    const prisma = {
      thesisOutcome: {
        findMany: jest.fn().mockResolvedValue([
          {
            outcomeScore: '12.5000',
            targetReturn: '0.2000',
            actualReturn: '0.2500',
            thesis: { author: author('alice') },
          },
        ]),
      },
    };
    const service = new LeaderboardService(prisma as unknown as PrismaService);

    const result = await service.getLeaderboard();

    expect(result).toEqual([
      {
        rank: 1,
        author: author('alice'),
        evaluatedCount: 1,
        totalScore: 12.5,
        averageScore: 12.5,
        hitRate: 1,
      },
    ]);
  });
});
