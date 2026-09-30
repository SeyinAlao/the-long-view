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

// The daily market-data refresh and evaluation run in-process by
// default, which is what local development wants. A deployed API sets
// DISABLE_SCHEDULED_JOBS=true: on a host that sleeps when idle, an
// in-process cron can't be relied on to fire, and the same jobs run on
// a real schedule elsewhere (GitHub Actions) - running both would do
// the work twice. Without ScheduleModule registered, the @Cron methods
// are inert metadata and never fire.
//
// ConfigModule.forRoot() is called first, on its own line, because it
// is what loads .env into process.env - reading the flag before it
// would miss a value set only in .env.
const configModule = ConfigModule.forRoot({ isGlobal: true });
const scheduledJobs = process.env.DISABLE_SCHEDULED_JOBS === 'true' ? [] : [ScheduleModule.forRoot()];

// Phase 7: the leaderboard. Remaining domain modules (comments,
// reactions, watchlists, track-record, notifications, admin — spec
// section 24) still get added one at a time, each as its own module
// registered here.
@Module({
  imports: [
    configModule,
    ...scheduledJobs,
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
