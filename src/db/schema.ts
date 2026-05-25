/** Встроенная схема SQLite (не зависит от копирования .sql в dist). */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  telegram_user_id INTEGER PRIMARY KEY NOT NULL,
  premium_until TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  cohort TEXT,
  day_push_enabled INTEGER NOT NULL DEFAULT 0,
  day_push_timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
  day_push_local_hhmm TEXT NOT NULL DEFAULT '09:00',
  day_push_last_calendar_date TEXT,
  day_push_last_sent_date TEXT,
  last_seen_release TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_draw_slots (
  user_id INTEGER NOT NULL,
  calendar_date TEXT NOT NULL,
  PRIMARY KEY (user_id, calendar_date)
);

CREATE TABLE IF NOT EXISTS spread_draw_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  calendar_date TEXT NOT NULL,
  used_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spread_draw_slots_user_date ON spread_draw_slots (user_id, calendar_date);

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY NOT NULL,
  premium_days INTEGER NOT NULL,
  valid_from TEXT,
  valid_until TEXT,
  redeemed_at TEXT,
  redeemed_by_user_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_day_push ON users (day_push_enabled);
`;
