import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_POLICY } from './rate-limit.decorator';
import type { RateLimitPolicy } from './rate-limits';
import { RateLimiterService } from './rate-limiter.service';
import { getEdgeInfo } from './request-edge';

// The per-IP limit, on every route, before any other guard (it is
// global, and global guards run first - so a throttled Google start
// never reaches Google). Counts only a client IP the frontend vouched
// for: a request without one (our own server-side fetches, the health
// check, development) isn't limited per IP (ADR 010).
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiterService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const { clientIp } = getEdgeInfo(context.switchToHttp().getRequest<Request>());
    if (!clientIp) return true;
    const policy =
      this.reflector.getAllAndOverride<RateLimitPolicy | undefined>(RATE_LIMIT_POLICY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'read';
    this.limiter.hitIp(policy, clientIp);
    return true;
  }
}
