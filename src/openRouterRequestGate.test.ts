import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetOpenRouterRequestGateForTests,
  withOpenRouterRateLimit,
} from './openRouterRequestGate.js';

describe('openRouterRequestGate', () => {
  afterEach(() => {
    resetOpenRouterRequestGateForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('spaces request starts by the minimum gap', async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const run = () =>
      withOpenRouterRateLimit(async () => {
        starts.push(Date.now());
      });
    const all = Promise.all([run(), run(), run()]);
    await vi.advanceTimersByTimeAsync(10_000);
    await all;
    expect(starts).toHaveLength(3);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(3200);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(3200);
  });

  it('does not wait for a slow request before starting the next one', async () => {
    vi.useFakeTimers();
    let releaseSlow!: () => void;
    const slow = withOpenRouterRateLimit(
      () =>
        new Promise<void>((resolve) => {
          releaseSlow = resolve;
        }),
    );
    const startedSecond = vi.fn();
    const second = withOpenRouterRateLimit(async () => {
      startedSecond();
    });
    await vi.advanceTimersByTimeAsync(3200);
    expect(startedSecond).toHaveBeenCalledOnce();
    releaseSlow();
    await Promise.all([slow, second]);
  });
});
