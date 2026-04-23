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
  db = instance;
  return instance;
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
