import { createHmac, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FixedWindowCounter } from './fixed-window-counter';
import {
  ACCOUNT_FAILURES,
  MAX_TRACKED_KEYS,
  RATE_LIMITS,
  STORE_FULL_LOG_INTERVAL_MS,
  type RateLimitPolicy,
} from './rate-limits';
import { RateLimitedException } from './rate-limited.exception';
import { SecurityLog } from './security-log.service';

// The two limiters (ADR 010): requests per client IP, by policy, and
// failed password sign-ins per account. Both throw RateLimitedException.
@Injectable()
export class RateLimiterService {
  private readonly perIp = new Map<RateLimitPolicy, FixedWindowCounter>();
  private readonly accountFailures: FixedWindowCounter;
  // Accounts are counted under an HMAC of the email with a key that
  // lives only in this process, so memory never holds an email either.
  private readonly accountKeySecret = randomBytes(32);
  private readonly lastFullLog = new Map<string, number>();

  constructor(private readonly log: SecurityLog) {
    for (const [policy, { windowMs }] of Object.entries(RATE_LIMITS) as [RateLimitPolicy, { windowMs: number }][]) {
      this.perIp.set(policy, this.counter(windowMs, `ip:${policy}`));
    }
    this.accountFailures = this.counter(ACCOUNT_FAILURES.windowMs, 'account');
  }

  hitIp(policy: RateLimitPolicy, ip: string): void {
    const { count, retryAfterSec } = this.perIp.get(policy)!.hit(ip);
    if (count > RATE_LIMITS[policy].limit) {
      this.log.throttled('ip', policy, ip);
      throw new RateLimitedException(retryAfterSec);
    }
  }

  // Before checking a password: refuses once this account has had too
  // many failures, whatever the IP, without spending a bcrypt compare.
  assertAccountAllowed(email: string, ip: string | null): void {
    const { count, retryAfterSec } = this.accountFailures.peek(this.accountKey(email));
    if (count >= ACCOUNT_FAILURES.limit) {
      this.log.throttled('account', 'login', ip);
      throw new RateLimitedException(retryAfterSec);
    }
  }

  recordAccountFailure(email: string): void {
    this.accountFailures.hit(this.accountKey(email));
  }

  clearAccount(email: string): void {
    this.accountFailures.reset(this.accountKey(email));
  }

  // For the memory-cap tests.
  trackedKeys(): { perIp: Record<string, number>; accounts: number } {
    const perIp = Object.fromEntries([...this.perIp].map(([policy, counter]) => [policy, counter.size]));
    return { perIp, accounts: this.accountFailures.size };
  }

  private accountKey(email: string): string {
    return createHmac('sha256', this.accountKeySecret).update(email).digest('base64url');
  }

  private counter(windowMs: number, name: string): FixedWindowCounter {
    return new FixedWindowCounter(windowMs, MAX_TRACKED_KEYS, () => this.storeFull(name));
  }

  private storeFull(name: string): void {
    const now = Date.now();
    if (now - (this.lastFullLog.get(name) ?? 0) < STORE_FULL_LOG_INTERVAL_MS) return;
    this.lastFullLog.set(name, now);
    this.log.storeFull(name);
  }
}
