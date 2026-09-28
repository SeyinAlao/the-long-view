import { apiFetch } from './api';

export interface LeaderboardEntry {
  rank: number;
  author: { id: string; username: string; name: string };
  evaluatedCount: number;
  totalScore: number;
  averageScore: number;
  hitRate: number;
}

export function fetchLeaderboard() {
  return apiFetch<LeaderboardEntry[]>('/leaderboard');
}
