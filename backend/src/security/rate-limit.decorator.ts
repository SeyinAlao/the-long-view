import { SetMetadata } from '@nestjs/common';
import type { RateLimitPolicy } from './rate-limits';

export const RATE_LIMIT_POLICY = 'rateLimitPolicy';

// Which per-IP limit a route (or a whole controller) counts against.
// Routes without one use "read". Numbers: rate-limits.ts.
export const RateLimit = (policy: RateLimitPolicy) => SetMetadata(RATE_LIMIT_POLICY, policy);
