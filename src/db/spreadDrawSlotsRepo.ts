import { getDb } from './database.js';
import { SPREAD_MAX_FOR_BASIC } from '../spreadConstants.js';

export function countSpreadDrawsForUserOnDaySync(userId: number, calendarDayKey: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS c FROM spread_draw_slots WHERE user_id = ? AND calendar_date = ?')
    .get(userId, calendarDayKey) as { c: number } | undefined;
  return row?.c ?? 0;
}

/**
 * Зарезервировать один расклад для basic за календарные сутки.
 * @returns id строки для отката при сбое или null, если лимит исчерпан
 */
export function tryConsumeSpreadDrawSlotSync(
  userId: number,
  calendarDayKey: string,
): number | null {
  const database = getDb();
  return database.transaction(() => {
    const count = countSpreadDrawsForUserOnDaySync(userId, calendarDayKey);
    if (count >= SPREAD_MAX_FOR_BASIC) return null;
    const usedAt = new Date().toISOString();
    const result = database
      .prepare('INSERT INTO spread_draw_slots (user_id, calendar_date, used_at) VALUES (?, ?, ?)')
      .run(userId, calendarDayKey, usedAt);
    return Number(result.lastInsertRowid);
  })();
}

/** Освободить слот (например после сбоя ИИ до успешной выдачи). */
export function releaseSpreadDrawSlotByIdSync(slotId: number): void {
  getDb().prepare('DELETE FROM spread_draw_slots WHERE id = ?').run(slotId);
}
