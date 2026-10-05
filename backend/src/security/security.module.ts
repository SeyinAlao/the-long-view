import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EdgeClientMiddleware } from './edge-client.middleware';
import { GoogleRateLimitFilter } from './google-rate-limit.filter';
import { HttpErrorsFilter } from './http-errors.filter';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';
import { SecurityLog } from './security-log.service';

// Rate limiting, the edge check and security logging (ADR 010, audit
// items G3 and F-08). Global, so the auth code can use the limiter and
// the log without every module importing this one.
@Global()
@Module({
  providers: [
    SecurityLog,
    RateLimiterService,
    GoogleRateLimitFilter,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: HttpErrorsFilter },
  ],
  exports: [SecurityLog, RateLimiterService, GoogleRateLimitFilter],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EdgeClientMiddleware).forRoutes('{*path}');
  }
}
