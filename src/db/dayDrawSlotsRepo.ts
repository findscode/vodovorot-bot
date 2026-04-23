import { getDb } from './database.js';

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
    database.prepare('INSERT INTO day_draw_slots (user_id, calendar_date) VALUES (?, ?)').run(userId, calendarDayKey);
    return true;
  })();
}
