import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetOpenRouterRequestGateForTests,
  withOpenRouterRateLimit,
} from './openRouterRequestGate.js';

describe('openRouterRequestGate', () => {
  afterEach(() => {
    resetOpenRouterRequestGateForTests();
    vi.restoreAllMocks();
  });

  it('serializes calls with minimum gap', async () => {
    const times: number[] = [];
    await Promise.all([
      withOpenRouterRateLimit(async () => {
        times.push(Date.now());
      }),
      withOpenRouterRateLimit(async () => {
        times.push(Date.now());
      }),
    ]);
    expect(times).toHaveLength(2);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(3000);
  });
});
