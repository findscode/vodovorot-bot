import { normalizeDayPushHhmm } from './dayPushPresets.js';

/** Время ежедневной отправки «карта дня» по подписке (локально в `day_push_timezone`). */
export function getDefaultDayPushHhmm(): string {
  const raw = process.env.DAY_PUSH_DEFAULT_HHMM?.trim();
  if (!raw) return '09:00';
  return normalizeDayPushHhmm(raw) ?? '09:00';
}
