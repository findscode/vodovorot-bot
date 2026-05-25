import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';

let db: Database.Database | null = null;

export function getDatabasePath(): string {
  const fromEnv = process.env.DATABASE_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), 'data', 'vodovorot.db');
}

export function initDatabase(customPath?: string): Database.Database {
  if (db) return db;
  const path = customPath ?? getDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  const instance = new Database(path);
  instance.pragma('journal_mode = WAL');
  instance.exec(SCHEMA_SQL);
  applyUserSchemaMigrations(instance);
  applySpreadDrawSlotsMigration(instance);
  db = instance;
  return instance;
}

/** Добавление колонок в `users` на существующих БД. */
function applyUserSchemaMigrations(instance: Database.Database): void {
  const cols = instance.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'cohort')) {
    instance.exec('ALTER TABLE users ADD COLUMN cohort TEXT');
  }
  if (!cols.some((c) => c.name === 'day_push_last_sent_date')) {
    instance.exec('ALTER TABLE users ADD COLUMN day_push_last_sent_date TEXT');
  }
  if (!cols.some((c) => c.name === 'last_seen_release')) {
    instance.exec('ALTER TABLE users ADD COLUMN last_seen_release TEXT');
  }
}

/** Миграция spread_draw_slots к схеме с calendar_date (лимит basic — за сутки). */
function applySpreadDrawSlotsMigration(instance: Database.Database): void {
  const table = instance
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='spread_draw_slots'")
    .get() as { name: string } | undefined;
  if (!table) return;
  const cols = instance.prepare('PRAGMA table_info(spread_draw_slots)').all() as { name: string }[];
  if (cols.some((c) => c.name === 'calendar_date')) return;
  instance.exec(`
    DROP TABLE spread_draw_slots;
    CREATE TABLE spread_draw_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      calendar_date TEXT NOT NULL,
      used_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_spread_draw_slots_user_date ON spread_draw_slots (user_id, calendar_date);
  `);
}

/** Для тестов: закрыть и сбросить singleton. */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('База не инициализирована: вызовите initDatabase() до использования getDb()');
  }
  return db;
}
