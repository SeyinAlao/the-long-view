import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OutcomeRow {
  outcomeScore: number;
  targetReturn: number;
  actualReturn: number;
  author: { id: string; username: string; name: string };
}

export interface LeaderboardEntry {
  rank: number;
  author: { id: string; username: string; name: string };
  evaluatedCount: number;
  totalScore: number;
  averageScore: number;
  hitRate: number;
}

const LEADERBOARD_SIZE = 50;

// Four decimals matches how outcomeScore itself is stored, and keeps
// floating-point noise (0.1 + 0.2 style) out of what the API returns.
const round4 = (n: number) => Number(n.toFixed(4));

// A "hit" is the call going the direction it said it would. Magnitude
// is already priced into outcomeScore — this is the plain, readable
// question a reader actually asks: how often was this person right?
// A flat call (no predicted move) has no direction, so it never counts.
function isHit(row: OutcomeRow): boolean {
  return row.targetReturn !== 0 && Math.sign(row.targetReturn) === Math.sign(row.actualReturn);
}

// Pure — no I/O, so the ranking rules can be tested with hand-checked
// numbers, separate from however the outcomes are fetched. Ranked by
// cumulative score (see docs/decisions/006 for why cumulative, not
// average): ties break on more evaluated calls, then username, so the
// order is always deterministic rather than whatever the database
// happened to return.
export function rankAuthors(outcomes: OutcomeRow[]): LeaderboardEntry[] {
  const byAuthor = new Map<string, { author: OutcomeRow['author']; rows: OutcomeRow[] }>();

  for (const row of outcomes) {
    const existing = byAuthor.get(row.author.id);
    if (existing) {
      existing.rows.push(row);
    } else {
      byAuthor.set(row.author.id, { author: row.author, rows: [row] });
    }
  }

  const entries = [...byAuthor.values()].map(({ author, rows }) => {
    const totalScore = rows.reduce((sum, r) => sum + r.outcomeScore, 0);
    const hits = rows.filter(isHit).length;
    return {
      author,
      evaluatedCount: rows.length,
      totalScore: round4(totalScore),
      averageScore: round4(totalScore / rows.length),
      hitRate: round4(hits / rows.length),
    };
  });

  entries.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.evaluatedCount - a.evaluatedCount ||
      a.author.username.localeCompare(b.author.username),
  );

  return entries.slice(0, LEADERBOARD_SIZE).map((entry, index) => ({ rank: index + 1, ...entry }));
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const outcomes = await this.prisma.thesisOutcome.findMany({
      include: {
        // select, not include, for the author — same rule as everywhere
        // else a response touches the User model: never able to leak
        // passwordHash or googleId if that model grows a field.
        thesis: { select: { author: { select: { id: true, username: true, name: true } } } },
      },
    });

    return rankAuthors(
      outcomes.map((o) => ({
        outcomeScore: Number(o.outcomeScore),
        targetReturn: Number(o.targetReturn),
        actualReturn: Number(o.actualReturn),
        author: o.thesis.author,
      })),
    );
  }
}
