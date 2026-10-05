// Counts events per key in fixed windows, in memory, with a hard cap on
// how many keys it remembers. One Render instance serves the API, so
// memory is the whole picture; a restart forgets every count (ADR 010).
//
// A Map keeps insertion order, and a key is re-inserted whenever its
// window starts again. Every window here is the same length, so the
// first entry is always the one that expires soonest: dropping expired
// entries, or the oldest one when full, is O(1) from the front.
export type Count = { count: number; retryAfterSec: number };

export class FixedWindowCounter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly windowMs: number,
    private readonly maxKeys: number,
    private readonly onFull: () => void = () => {},
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.windows.size;
  }

  // Adds one event and returns the count so far in this window.
  hit(key: string): Count {
    const now = this.now();
    this.dropExpired(now);
    const current = this.windows.get(key);
    if (current) {
      current.count += 1;
      return { count: current.count, retryAfterSec: this.secondsUntil(current.resetAt, now) };
    }
    if (this.windows.size >= this.maxKeys) {
      this.onFull();
      while (this.windows.size >= this.maxKeys) this.windows.delete(this.windows.keys().next().value!);
    }
    const resetAt = now + this.windowMs;
    this.windows.set(key, { count: 1, resetAt });
    return { count: 1, retryAfterSec: this.secondsUntil(resetAt, now) };
  }

  // The count so far, without adding to it.
  peek(key: string): Count {
    const now = this.now();
    this.dropExpired(now);
    const current = this.windows.get(key);
    return current
      ? { count: current.count, retryAfterSec: this.secondsUntil(current.resetAt, now) }
      : { count: 0, retryAfterSec: 0 };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private dropExpired(now: number): void {
    for (const [key, { resetAt }] of this.windows) {
      if (resetAt > now) return;
      this.windows.delete(key);
    }
  }

  private secondsUntil(resetAt: number, now: number): number {
    return Math.max(1, Math.ceil((resetAt - now) / 1000));
  }
}
