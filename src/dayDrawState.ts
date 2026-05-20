import { join } from 'node:path';
import { hasDayDrawSlotUsedSync, tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';

const DEFAULT_DAY_DRAW_TIMEZONE = 'UTC';

/** Часовой пояс границы «суток» для лимита «карта дня» (IANA, по умолчанию UTC). */
export function getDayDrawTimezone(): string {
  const fromEnv = process.env.DAY_DRAW_TIMEZONE?.trim();
  return fromEnv || DEFAULT_DAY_DRAW_TIMEZONE;
}

/**
 * Календарная дата в часовом поясе лимита — `YYYY-MM-DD`.
 * Граница суток задаётся через `DAY_DRAW_TIMEZONE` или UTC.
 */
export function dayDrawCalendarDate(now = new Date()): string {
  return calendarDateInTimezone(now, getDayDrawTimezone());
}

/** @deprecated Используйте `dayDrawCalendarDate`. */
export const moscowCalendarDate = dayDrawCalendarDate;

export function calendarDateInTimezone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Путь к legacy JSON (только для однократной миграции в SQLite при старте). */
export function getDayDrawStatePath(): string {
  const fromEnv = process.env.DAY_DRAW_STATE_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), 'data', 'day-draw-state.json');
}

/** Уже использован слот на эту календарную дату (ключ как у `dayDrawCalendarDate`). */
export function hasDayDrawSlotUsed(userId: number, calendarDayKey: string): Promise<boolean> {
  return Promise.resolve(hasDayDrawSlotUsedSync(userId, calendarDayKey));
}

export function tryConsumeDayDrawSlot(userId: number, calendarDayKey: string): Promise<boolean> {
  return Promise.resolve(tryConsumeDayDrawSlotSync(userId, calendarDayKey));
}
