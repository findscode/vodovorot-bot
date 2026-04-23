/**
 * Последний сырой текст толкования для /last — в SQLite (переживает перезапуск процесса).
 */

import { getDb } from './db/database.js';

const MAX_TEXT_LENGTH = 12_000;

function isoNow(): string {
  return new Date().toISOString();
}

export function saveLastReading(userId: number, rawReadingPlain: string): void {
  const text =
    rawReadingPlain.length > MAX_TEXT_LENGTH
      ? `${rawReadingPlain.slice(0, MAX_TEXT_LENGTH)}…`
      : rawReadingPlain;
  const db = getDb();
  db.prepare(
    `INSERT INTO last_readings (telegram_user_id, plain_text, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(telegram_user_id) DO UPDATE SET plain_text = excluded.plain_text, updated_at = excluded.updated_at`,
  ).run(userId, text, isoNow());
}

export function getLastReading(userId: number): string | null {
  const row = getDb()
    .prepare('SELECT plain_text FROM last_readings WHERE telegram_user_id = ?')
    .get(userId) as { plain_text: string } | undefined;
  return row?.plain_text ?? null;
}
