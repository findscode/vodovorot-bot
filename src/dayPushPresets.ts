import { parseConfiguredHm } from './pushSchedule.js';

/** Быстрый выбор времени рассылки в чате (произвольное время — через <code>/pushtime ЧЧ:ММ</code>). */
export const DAY_PUSH_HHMM_PRESETS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '18:00',
  '21:00',
] as const;

/** Локальные часы:минуты на стене часов в поясе рассылки (00:00–23:59). */
export function normalizeDayPushHhmm(hhmm: string): string | null {
  const parsed = parseConfiguredHm(hhmm);
  if (!parsed) return null;
  const h = String(parsed.h).padStart(2, '0');
  const m = String(parsed.m).padStart(2, '0');
  return `${h}:${m}`;
}

export function isAllowedDayPushHhmm(hhmm: string): boolean {
  return normalizeDayPushHhmm(hhmm) !== null;
}
