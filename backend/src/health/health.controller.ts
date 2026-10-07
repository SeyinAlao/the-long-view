import { Controller, Get, Logger } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

// Both answer without the edge key (ADR 010), so anyone can call them.
// - /health/live: is the process up? No database call. The uptime
//   monitor (G2) calls this every few minutes, which keeps Render awake
//   without also keeping Neon's database from sleeping.
// - /health: is the database reachable too? Says only "up" or "down":
//   a database error message can name hosts and settings (F-12), so it
//   goes to the server log as its name and code only, never the message.
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.checkDatabase()]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (error) {
      const { name, code } = error as { name?: string; code?: string };
      this.logger.error(`health_database_down error=${name ?? 'Error'} code=${code ?? '-'}`);
      return { database: { status: 'down' } };
    }
  }
}
