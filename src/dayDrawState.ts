import { join } from 'node:path';
import { hasDayDrawSlotUsedSync, tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';

const DEFAULT_DAY_DRAW_TIMEZONE = 'Europe/Moscow';

/** Часовой пояс границы «суток» для лимита «карта дня» (IANA, например Europe/Moscow). */
export function getDayDrawTimezone(): string {
  const fromEnv = process.env.DAY_DRAW_TIMEZONE?.trim();
  return fromEnv || DEFAULT_DAY_DRAW_TIMEZONE;
}

/**
 * Календарная дата в часовом поясе лимита (по умолчанию Москва) — `YYYY-MM-DD`.
 * Граница суток задаётся через `DAY_DRAW_TIMEZONE` или `Europe/Moscow`.
 */
export function moscowCalendarDate(now = new Date()): string {
  return calendarDateInTimezone(now, getDayDrawTimezone());
}

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

/** Уже использован слот на эту календарную дату (ключ как у `moscowCalendarDate`). */
export function hasDayDrawSlotUsed(userId: number, calendarDayKey: string): Promise<boolean> {
  return Promise.resolve(hasDayDrawSlotUsedSync(userId, calendarDayKey));
}

/**
 * Резервирует «слот» карты дня на указанную календарную дату для userId.
 * @returns `true`, если слот выдан впервые за эту дату; `false`, если дата уже была записана.
 */
export function tryConsumeDayDrawSlot(userId: number, calendarDayKey: string): Promise<boolean> {
  return Promise.resolve(tryConsumeDayDrawSlotSync(userId, calendarDayKey));
}
