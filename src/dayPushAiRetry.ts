/** In-memory счётчик неудач push-ИИ за календарный день (один процесс бота). */

export const MAX_PUSH_AI_RETRIES_PER_DAY = 3;

const failCounts = new Map<string, number>();

export function pushAiFailKey(userId: number, todayKey: string): string {
  return `${userId}:${todayKey}`;
}

export function recordPushAiFailure(key: string): { count: number; shouldGiveUp: boolean } {
  const count = (failCounts.get(key) ?? 0) + 1;
  failCounts.set(key, count);
  return { count, shouldGiveUp: count >= MAX_PUSH_AI_RETRIES_PER_DAY };
}

export function clearPushAiFailure(key: string): void {
  failCounts.delete(key);
}

/** Только для тестов. */
export function resetPushAiFailuresForTests(): void {
  failCounts.clear();
}
