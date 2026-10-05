import { FixedWindowCounter } from './fixed-window-counter';

describe('FixedWindowCounter', () => {
  let now: number;
  const clock = () => now;
  beforeEach(() => (now = 1_000_000));

  it('counts per key within a window, then starts again', () => {
    const counter = new FixedWindowCounter(60_000, 100, undefined, clock);
    expect(counter.hit('a').count).toBe(1);
    expect(counter.hit('a').count).toBe(2);
    expect(counter.hit('b').count).toBe(1);
    now += 59_999;
    expect(counter.hit('a')).toEqual({ count: 3, retryAfterSec: 1 });
    now += 1;
    expect(counter.hit('a').count).toBe(1);
  });

  it('peeks without counting, and forgets a key on reset', () => {
    const counter = new FixedWindowCounter(60_000, 100, undefined, clock);
    counter.hit('a');
    expect(counter.peek('a')).toEqual({ count: 1, retryAfterSec: 60 });
    expect(counter.peek('a').count).toBe(1);
    counter.reset('a');
    expect(counter.peek('a')).toEqual({ count: 0, retryAfterSec: 0 });
  });

  it('drops expired keys as time passes', () => {
    const counter = new FixedWindowCounter(60_000, 100, undefined, clock);
    for (let i = 0; i < 50; i++) counter.hit(`k${i}`);
    now += 60_000;
    counter.hit('fresh');
    expect(counter.size).toBe(1);
  });

  it('never holds more than its cap under a flood of distinct keys, dropping the oldest first', () => {
    const onFull = jest.fn();
    const counter = new FixedWindowCounter(60_000, 1_000, onFull, clock);
    counter.hit('early');
    now += 1;
    for (let i = 0; i < 5_000; i++) {
      counter.hit(`flood-${i}`);
      expect(counter.size).toBeLessThanOrEqual(1_000);
    }
    expect(counter.size).toBe(1_000);
    expect(onFull).toHaveBeenCalled();
    expect(counter.peek('early').count).toBe(0);
    // Still counts correctly for a key that arrives after the flood.
    counter.hit('late');
    expect(counter.hit('late').count).toBe(2);
  });
});
