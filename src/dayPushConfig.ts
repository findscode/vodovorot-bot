import { normalizeDayPushHhmm } from './dayPushPresets.js';

/** Глобальный выключатель автоматической рассылки «На день» (`DAY_PUSH_ENABLED=1|true|yes`). */
export function isDayPushDeliveryEnabled(): boolean {
  const raw = process.env.DAY_PUSH_ENABLED?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Время ежедневной отправки «карта дня» по подписке (локально в `day_push_timezone`). */
export function getDefaultDayPushHhmm(): string {
  const raw = process.env.DAY_PUSH_DEFAULT_HHMM?.trim();
  if (!raw) return '09:00';
  return normalizeDayPushHhmm(raw) ?? '09:00';
}
