import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SecuritiesModule } from './securities/securities.module';
import { ThesesModule } from './theses/theses.module';
import { MarketDataModule } from './market-data/market-data.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

// Phase 7: the leaderboard. Remaining domain modules (comments,
// reactions, watchlists, track-record, notifications, admin — spec
// section 24) still get added one at a time, each as its own module
// registered here.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SecuritiesModule,
    ThesesModule,
    MarketDataModule,
    EvaluationModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
