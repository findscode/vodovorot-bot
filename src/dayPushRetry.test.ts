import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPushFailure,
  MAX_PUSH_FAILURE_RETRIES_PER_DAY,
  pushFailureKey,
  recordPushFailure,
  resetPushFailuresForTests,
} from './dayPushRetry.js';

describe('dayPushRetry', () => {
  afterEach(() => {
    resetPushFailuresForTests();
  });

  it('pushFailureKey isolates users, dates, and kinds', () => {
    expect(pushFailureKey(1, '2026-05-01', 'ai')).not.toBe(pushFailureKey(2, '2026-05-01', 'ai'));
    expect(pushFailureKey(1, '2026-05-01', 'ai')).not.toBe(pushFailureKey(1, '2026-05-02', 'ai'));
    expect(pushFailureKey(1, '2026-05-01', 'ai')).not.toBe(
      pushFailureKey(1, '2026-05-01', 'delivery'),
    );
  });

  it('shouldGiveUp after MAX failures', () => {
    const key = pushFailureKey(5, '2026-05-10', 'ai');
    expect(recordPushFailure(key)).toEqual({ count: 1, shouldGiveUp: false });
    expect(recordPushFailure(key)).toEqual({ count: 2, shouldGiveUp: false });
    expect(recordPushFailure(key)).toEqual({
      count: MAX_PUSH_FAILURE_RETRIES_PER_DAY,
      shouldGiveUp: true,
    });
  });

  it('clearPushFailure resets counter', () => {
    const key = pushFailureKey(7, '2026-05-11', 'delivery');
    recordPushFailure(key);
    clearPushFailure(key);
    expect(recordPushFailure(key).count).toBe(1);
  });
});
