/** @deprecated Импортируйте `dayPushRetry.ts`. */
import {
  clearPushFailure,
  MAX_PUSH_FAILURE_RETRIES_PER_DAY,
  pushFailureKey,
  recordPushFailure,
  resetPushFailuresForTests,
} from './dayPushRetry.js';

export const MAX_PUSH_AI_RETRIES_PER_DAY = MAX_PUSH_FAILURE_RETRIES_PER_DAY;

export function pushAiFailKey(userId: number, todayKey: string): string {
  return pushFailureKey(userId, todayKey, 'ai');
}

export const recordPushAiFailure = recordPushFailure;
export const clearPushAiFailure = clearPushFailure;
export const resetPushAiFailuresForTests = resetPushFailuresForTests;
