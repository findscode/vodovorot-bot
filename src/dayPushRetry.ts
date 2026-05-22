/** In-memory счётчики сбоев push за календарный день (один процесс бота). */

export const MAX_PUSH_FAILURE_RETRIES_PER_DAY = 3;

export type DayPushFailureKind = 'ai' | 'delivery';

const failCounts = new Map<string, number>();

export function pushFailureKey(userId: number, todayKey: string, kind: DayPushFailureKind): string {
  return `${userId}:${todayKey}:${kind}`;
}

export function recordPushFailure(key: string): { count: number; shouldGiveUp: boolean } {
  const count = (failCounts.get(key) ?? 0) + 1;
  failCounts.set(key, count);
  return { count, shouldGiveUp: count >= MAX_PUSH_FAILURE_RETRIES_PER_DAY };
}

export function clearPushFailure(key: string): void {
  failCounts.delete(key);
}

export function clearPushFailuresForDay(userId: number, todayKey: string): void {
  clearPushFailure(pushFailureKey(userId, todayKey, 'ai'));
  clearPushFailure(pushFailureKey(userId, todayKey, 'delivery'));
}

/** Только для тестов. */
export function resetPushFailuresForTests(): void {
  failCounts.clear();
}
