import { RateLimiterService } from './rate-limiter.service';
import { RateLimitedException } from './rate-limited.exception';
import { ACCOUNT_FAILURES, MAX_TRACKED_KEYS, RATE_LIMITS } from './rate-limits';
import type { SecurityLog } from './security-log.service';

describe('RateLimiterService', () => {
  let log: jest.Mocked<Pick<SecurityLog, 'throttled' | 'storeFull'>>;
  let limiter: RateLimiterService;

  beforeEach(() => {
    log = { throttled: jest.fn(), storeFull: jest.fn() };
    limiter = new RateLimiterService(log as unknown as SecurityLog);
  });

  it('allows a policy up to its limit per IP, then throws with a wait', () => {
    for (let i = 0; i < RATE_LIMITS.login.limit; i++) limiter.hitIp('login', '203.0.113.7');
    expect(() => limiter.hitIp('login', '203.0.113.7')).toThrow(RateLimitedException);
    expect(log.throttled).toHaveBeenCalledWith('ip', 'login', '203.0.113.7');
    expect(() => limiter.hitIp('login', '203.0.113.8')).not.toThrow();
    expect(() => limiter.hitIp('write', '203.0.113.7')).not.toThrow();
  });

  it('refuses an account after its failure limit, and forgets it on success', () => {
    for (let i = 0; i < ACCOUNT_FAILURES.limit; i++) {
      limiter.assertAccountAllowed('ada@example.com', null);
      limiter.recordAccountFailure('ada@example.com');
    }
    expect(() => limiter.assertAccountAllowed('ada@example.com', null)).toThrow(RateLimitedException);
    expect(() => limiter.assertAccountAllowed('bea@example.com', null)).not.toThrow();
    limiter.clearAccount('ada@example.com');
    expect(() => limiter.assertAccountAllowed('ada@example.com', null)).not.toThrow();
  });

  it('stays within its memory cap under a flood of distinct IPs, and logs that once', () => {
    for (let i = 0; i < MAX_TRACKED_KEYS * 2; i++) limiter.hitIp('read', `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`);
    expect(limiter.trackedKeys().perIp.read).toBe(MAX_TRACKED_KEYS);
    expect(log.storeFull).toHaveBeenCalledTimes(1);
    expect(log.storeFull).toHaveBeenCalledWith('ip:read');
    // A real client arriving after the flood is still counted and limited.
    for (let i = 0; i < RATE_LIMITS.read.limit; i++) limiter.hitIp('read', '203.0.113.7');
    expect(() => limiter.hitIp('read', '203.0.113.7')).toThrow(RateLimitedException);
  });

  it('stays within its memory cap under a flood of distinct emails', () => {
    for (let i = 0; i < MAX_TRACKED_KEYS * 2; i++) limiter.recordAccountFailure(`flood-${i}@example.com`);
    expect(limiter.trackedKeys().accounts).toBe(MAX_TRACKED_KEYS);
    expect(log.storeFull).toHaveBeenCalledWith('account');
    for (let i = 0; i < ACCOUNT_FAILURES.limit; i++) limiter.recordAccountFailure('ada@example.com');
    expect(() => limiter.assertAccountAllowed('ada@example.com', null)).toThrow(RateLimitedException);
  });

  it('the 429 says when to try again, in the same words for either limit', () => {
    const refusal = (attempt: () => void) => {
      try {
        attempt();
      } catch (error) {
        return (error as RateLimitedException).getResponse();
      }
    };
    for (let i = 0; i < RATE_LIMITS.login.limit; i++) limiter.hitIp('login', '203.0.113.7');
    for (let i = 0; i < ACCOUNT_FAILURES.limit; i++) limiter.recordAccountFailure('ada@example.com');
    const expected = { statusCode: 429, message: 'Too many attempts. Try again in 15 minutes.' };
    expect(refusal(() => limiter.hitIp('login', '203.0.113.7'))).toEqual(expected);
    expect(refusal(() => limiter.assertAccountAllowed('ada@example.com', null))).toEqual(expected);
  });
});
