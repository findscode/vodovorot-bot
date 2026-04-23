import { snapDayPushHhmmToPreset } from './dayPushPresets.js';

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Время ежедневной отправки «карта дня» по подписке (локально в `day_push_timezone`). */
export function getDefaultDayPushHhmm(): string {
  const raw = process.env.DAY_PUSH_DEFAULT_HHMM?.trim();
  if (raw && HHMM_RE.test(raw)) {
    return snapDayPushHhmmToPreset(raw);
  }
  return '09:00';
}
