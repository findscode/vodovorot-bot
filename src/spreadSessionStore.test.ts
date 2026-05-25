import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginSpreadSession,
  clearSpreadSessionsForTests,
  endSpreadSession,
  getSpreadSession,
  hasActiveSpreadSession,
  hasSpreadAwaitingQuestion,
  setSpreadPhase,
} from './spreadSessionStore.js';
import { SPREAD_SESSION_TTL_MS } from './spreadConstants.js';

describe('spreadSessionStore', () => {
  afterEach(() => {
    clearSpreadSessionsForTests();
    vi.useRealTimers();
  });

  it('tracks intro then awaiting question', () => {
    beginSpreadSession(1, 100);
    expect(hasActiveSpreadSession(1)).toBe(true);
    expect(hasSpreadAwaitingQuestion(1)).toBe(false);
    expect(getSpreadSession(1)?.phase).toBe('intro');
    setSpreadPhase(1, 'awaiting_question');
    expect(hasSpreadAwaitingQuestion(1)).toBe(true);
    endSpreadSession(1);
    expect(hasActiveSpreadSession(1)).toBe(false);
  });

  it('expires after TTL', () => {
    vi.useFakeTimers();
    beginSpreadSession(2, 200);
    vi.advanceTimersByTime(SPREAD_SESSION_TTL_MS + 1);
    expect(hasActiveSpreadSession(2)).toBe(false);
  });
});
