import { getDb } from './database.js';

/** Сколько раз пользователь уже получал «карту дня» (строки в day_draw_slots). */
export function countDayDrawSlotsForUserSync(userId: number): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS c FROM day_draw_slots WHERE user_id = ?')
    .get(userId) as { c: number } | undefined;
  return row?.c ?? 0;
}

export function hasDayDrawSlotUsedSync(userId: number, calendarDayKey: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 AS x FROM day_draw_slots WHERE user_id = ? AND calendar_date = ?')
    .get(userId, calendarDayKey);
  return row !== undefined;
}

/** @returns true если слот выдан впервые за эту дату */
export function tryConsumeDayDrawSlotSync(userId: number, calendarDayKey: string): boolean {
  const database = getDb();
  return database.transaction(() => {
    const got = database
      .prepare('SELECT 1 AS x FROM day_draw_slots WHERE user_id = ? AND calendar_date = ?')
      .get(userId, calendarDayKey);
    if (got !== undefined) return false;
    database
      .prepare('INSERT INTO day_draw_slots (user_id, calendar_date) VALUES (?, ?)')
      .run(userId, calendarDayKey);
    return true;
  })();
}

/** Освободить слот (например после сбоя ИИ до успешной выдачи). */
export function releaseDayDrawSlotSync(userId: number, calendarDayKey: string): void {
  getDb()
    .prepare('DELETE FROM day_draw_slots WHERE user_id = ? AND calendar_date = ?')
    .run(userId, calendarDayKey);
}
