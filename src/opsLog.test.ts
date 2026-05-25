import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOpsStatsSnapshot,
  opsAiError,
  opsAiRequest,
  opsEvent,
  resetOpsStatsForTests,
} from './opsLog.js';

describe('opsLog', () => {
  afterEach(() => {
    resetOpsStatsForTests();
    vi.restoreAllMocks();
  });

  it('logs structured event and increments counter', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    opsEvent('spread_limit_hit');
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[ops\] event=spread_limit_hit day=\d{4}-\d{2}-\d{2}$/),
    );
    expect(getOpsStatsSnapshot().counts.spread_limit_hit).toBe(1);
  });

  it('tracks ai latency samples for p95', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (let i = 1; i <= 20; i++) opsAiRequest('spread', i * 10);
    const snap = getOpsStatsSnapshot();
    expect(snap.aiLatencySampleCount).toBe(20);
    expect(snap.aiLatencyP95Ms).toBe(190);
  });

  it('aggregates ai errors by context', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    opsAiError('spread', 'timeout');
    opsAiError('spread');
    opsAiError('day');
    const snap = getOpsStatsSnapshot();
    expect(snap.counts.ai_error).toBe(3);
    expect(snap.aiErrorsByContext.spread).toBe(2);
    expect(snap.aiErrorsByContext.day).toBe(1);
  });
});
