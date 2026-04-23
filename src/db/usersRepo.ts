import { getDb } from './database.js';

function isoNow(): string {
  return new Date().toISOString();
}

export function getOrCreateUser(userId: number): void {
  const db = getDb();
  const t = isoNow();
  db.prepare(
    `INSERT INTO users (telegram_user_id, created_at, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(telegram_user_id) DO UPDATE SET updated_at = excluded.updated_at`,
  ).run(userId, t, t);
}

export function setUserAdminSync(userId: number, isAdmin: boolean): void {
  getOrCreateUser(userId);
  getDb()
    .prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE telegram_user_id = ?')
    .run(isAdmin ? 1 : 0, isoNow(), userId);
}

export function userHasPremiumOrAdminSync(userId: number): boolean {
  const row = getDb()
    .prepare('SELECT is_admin, premium_until FROM users WHERE telegram_user_id = ?')
    .get(userId) as { is_admin: number; premium_until: string | null } | undefined;
  if (!row) return false;
  if (row.is_admin === 1) return true;
  if (!row.premium_until) return false;
  return new Date(row.premium_until) > new Date();
}

export function setDayPushEnabled(
  userId: number,
  enabled: boolean,
  timezoneIana: string,
  localHhmmWhenEnabling: string = '09:00',
): void {
  getOrCreateUser(userId);
  const db = getDb();
  const t = isoNow();
  if (enabled) {
    db.prepare(
      `UPDATE users SET day_push_enabled = 1, day_push_timezone = ?, day_push_local_hhmm = ?, updated_at = ?
       WHERE telegram_user_id = ?`,
    ).run(timezoneIana, localHhmmWhenEnabling, t, userId);
  } else {
    db.prepare(
      `UPDATE users SET day_push_enabled = 0, day_push_timezone = ?, updated_at = ?
       WHERE telegram_user_id = ?`,
    ).run(timezoneIana, t, userId);
  }
}

export function isDayPushEnabledSync(userId: number): boolean {
  const row = getDb()
    .prepare('SELECT day_push_enabled FROM users WHERE telegram_user_id = ?')
    .get(userId) as { day_push_enabled: number } | undefined;
  return row?.day_push_enabled === 1;
}

/** Если подписка на рассылку включена — локальное время и пояс строки. */
export function getDayPushScheduleForUserSync(
  userId: number,
): { hhmm: string; timezoneIana: string } | null {
  const row = getDb()
    .prepare(
      `SELECT day_push_enabled, day_push_local_hhmm, day_push_timezone
       FROM users WHERE telegram_user_id = ?`,
    )
    .get(userId) as
    | { day_push_enabled: number; day_push_local_hhmm: string; day_push_timezone: string }
    | undefined;
  if (!row || row.day_push_enabled !== 1) return null;
  return { hhmm: row.day_push_local_hhmm, timezoneIana: row.day_push_timezone };
}

/** Дата окончания Premium в будущем или `null`. */
export function getActivePremiumUntilSync(userId: number): Date | null {
  const row = getDb()
    .prepare('SELECT premium_until FROM users WHERE telegram_user_id = ?')
    .get(userId) as { premium_until: string | null } | undefined;
  if (!row?.premium_until) return null;
  const d = new Date(row.premium_until);
  return d > new Date() ? d : null;
}

export type DayPushSubscriberRow = {
  telegram_user_id: number;
  day_push_timezone: string;
  day_push_local_hhmm: string;
  day_push_last_calendar_date: string | null;
};

export function listDayPushSubscribersSync(): DayPushSubscriberRow[] {
  return getDb()
    .prepare(
      `SELECT telegram_user_id, day_push_timezone, day_push_local_hhmm, day_push_last_calendar_date
       FROM users WHERE day_push_enabled = 1`,
    )
    .all() as DayPushSubscriberRow[];
}

export function markDayPushHandledSync(userId: number, calendarDateKey: string): void {
  getOrCreateUser(userId);
  getDb()
    .prepare(
      'UPDATE users SET day_push_last_calendar_date = ?, updated_at = ? WHERE telegram_user_id = ?',
    )
    .run(calendarDateKey, isoNow(), userId);
}

export function extendPremiumByDaysSync(userId: number, days: number): void {
  getOrCreateUser(userId);
  const row = getDb()
    .prepare('SELECT premium_until FROM users WHERE telegram_user_id = ?')
    .get(userId) as { premium_until: string | null } | undefined;
  const now = new Date();
  let base: Date;
  if (row?.premium_until) {
    const cur = new Date(row.premium_until);
    base = cur > now ? cur : now;
  } else {
    base = now;
  }
  base.setUTCDate(base.getUTCDate() + days);
  getDb()
    .prepare('UPDATE users SET premium_until = ?, updated_at = ? WHERE telegram_user_id = ?')
    .run(base.toISOString(), isoNow(), userId);
}

export type PromoRedeemResult = 'ok' | 'used' | 'invalid' | 'expired';

export function tryRedeemPromoCodeSync(userId: number, rawCode: string): PromoRedeemResult {
  const code = rawCode.trim();
  if (!code || code.length > 64) return 'invalid';

  const db = getDb();
  const nowIso = isoNow();
  const now = new Date();

  const outcome = db.transaction(() => {
    const row = db
      .prepare(
        `SELECT code, premium_days, valid_from, valid_until, redeemed_at
         FROM promo_codes WHERE code = ?`,
      )
      .get(code) as
      | {
          code: string;
          premium_days: number;
          valid_from: string | null;
          valid_until: string | null;
          redeemed_at: string | null;
        }
      | undefined;

    if (!row) return 'invalid' as const;
    if (row.redeemed_at) return 'used' as const;
    if (row.valid_from && new Date(row.valid_from) > now) return 'invalid' as const;
    if (row.valid_until && new Date(row.valid_until) < now) return 'expired' as const;

    const res = db
      .prepare(
        `UPDATE promo_codes SET redeemed_at = ?, redeemed_by_user_id = ?
         WHERE code = ? AND redeemed_at IS NULL`,
      )
      .run(nowIso, userId, code);

    if (res.changes !== 1) return 'used' as const;

    extendPremiumByDaysSync(userId, row.premium_days);
    return 'ok' as const;
  })();

  return outcome;
}
