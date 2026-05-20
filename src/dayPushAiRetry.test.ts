import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPushAiFailure,
  MAX_PUSH_AI_RETRIES_PER_DAY,
  pushAiFailKey,
  recordPushAiFailure,
  resetPushAiFailuresForTests,
} from './dayPushAiRetry.js';

describe('dayPushAiRetry', () => {
  afterEach(() => {
    resetPushAiFailuresForTests();
  });

  it('pushAiFailKey isolates users and dates', () => {
    expect(pushAiFailKey(1, '2026-05-01')).not.toBe(pushAiFailKey(2, '2026-05-01'));
    expect(pushAiFailKey(1, '2026-05-01')).not.toBe(pushAiFailKey(1, '2026-05-02'));
  });

  it('shouldGiveUp after MAX failures', () => {
    const key = pushAiFailKey(5, '2026-05-10');
    expect(recordPushAiFailure(key)).toEqual({ count: 1, shouldGiveUp: false });
    expect(recordPushAiFailure(key)).toEqual({ count: 2, shouldGiveUp: false });
    expect(recordPushAiFailure(key)).toEqual({
      count: MAX_PUSH_AI_RETRIES_PER_DAY,
      shouldGiveUp: true,
    });
  });

  it('clearPushAiFailure resets counter', () => {
    const key = pushAiFailKey(7, '2026-05-11');
    recordPushAiFailure(key);
    clearPushAiFailure(key);
    expect(recordPushAiFailure(key).count).toBe(1);
  });
});
