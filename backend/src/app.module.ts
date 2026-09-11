import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

// Phase 0: foundation only. Domain modules (auth, users, securities,
// theses, counter-theses, comments, reactions, watchlists, track-record,
// leaderboard, notifications, admin — spec section 24) are added one at a
// time starting in Phase 1, each as its own module registered here.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
