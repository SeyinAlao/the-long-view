import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

// Public on purpose — same as the feed. A ranking nobody can look at
// without an account isn't much of a public record.
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getLeaderboard() {
    return this.leaderboardService.getLeaderboard();
  }
}
