import { normalizeDayPushHhmm } from '../dayPushPresets.js';
import { generateTarotPromoCode } from '../promoCodeGenerator.js';
import { PROMO_PREMIUM_DAYS } from '../promoConfig.js';
import { checkPromoRedeemAttempt } from '../promoRedeemLimit.js';
import { getDb } from './database.js';

const PROMO_CREATE_MAX_ATTEMPTS = 32;

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

export function userIsAdminSync(userId: number): boolean {
  const row = getDb()
    .prepare('SELECT is_admin FROM users WHERE telegram_user_id = ?')
    .get(userId) as { is_admin: number } | undefined;
  return row?.is_admin === 1;
}

export function userHasActivePremiumSync(userId: number): boolean {
  return getActivePremiumUntilSync(userId) !== null;
}

export function userHasPremiumOrAdminSync(userId: number): boolean {
  return userIsAdminSync(userId) || userHasActivePremiumSync(userId);
}

export function clearPremiumSync(userId: number): void {
  getOrCreateUser(userId);
  getDb()
    .prepare('UPDATE users SET premium_until = NULL, updated_at = ? WHERE telegram_user_id = ?')
    .run(isoNow(), userId);
}

export function setUserCohortSync(userId: number, cohort: string | null): void {
  getOrCreateUser(userId);
  getDb()
    .prepare('UPDATE users SET cohort = ?, updated_at = ? WHERE telegram_user_id = ?')
    .run(cohort, isoNow(), userId);
}

export function getUserCohortSync(userId: number): string | null {
  const row = getDb().prepare('SELECT cohort FROM users WHERE telegram_user_id = ?').get(userId) as
    | { cohort: string | null }
    | undefined;
  return row?.cohort ?? null;
}

export type UserAdminInfoRow = {
  telegram_user_id: number;
  is_admin: number;
  premium_until: string | null;
  cohort: string | null;
  day_push_enabled: number;
  created_at: string;
};

export function getUserAdminInfoSync(userId: number): UserAdminInfoRow | null {
  getOrCreateUser(userId);
  const row = getDb()
    .prepare(
      `SELECT telegram_user_id, is_admin, premium_until, cohort, day_push_enabled, created_at
       FROM users WHERE telegram_user_id = ?`,
    )
    .get(userId) as UserAdminInfoRow | undefined;
  return row ?? null;
}

export function countUsersSync(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  return row.c;
}

export function countActivePremiumSync(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM users
       WHERE premium_until IS NOT NULL AND premium_until > datetime('now')`,
    )
    .get() as { c: number };
  return row.c;
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
      `UPDATE users SET day_push_enabled = 1, day_push_timezone = ?, day_push_local_hhmm = ?,
        day_push_last_sent_date = NULL, updated_at = ?
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

/** Смена времени рассылки только при включённой подписке и валидном локальном ЧЧ:ММ. */
export function setDayPushLocalHhmmSync(userId: number, hhmm: string): boolean {
  const canonical = normalizeDayPushHhmm(hhmm);
  if (!canonical) return false;
  const row = getDb()
    .prepare('SELECT day_push_enabled FROM users WHERE telegram_user_id = ?')
    .get(userId) as { day_push_enabled: number } | undefined;
  if (!row || row.day_push_enabled !== 1) return false;
  getDb()
    .prepare('UPDATE users SET day_push_local_hhmm = ?, updated_at = ? WHERE telegram_user_id = ?')
    .run(canonical, isoNow(), userId);
  return true;
}

export type DayPushSubscriberRow = {
  telegram_user_id: number;
  day_push_timezone: string;
  day_push_local_hhmm: string;
  day_push_last_sent_date: string | null;
};

export function listDayPushSubscribersSync(): DayPushSubscriberRow[] {
  return getDb()
    .prepare(
      `SELECT telegram_user_id, day_push_timezone, day_push_local_hhmm, day_push_last_sent_date
       FROM users WHERE day_push_enabled = 1`,
    )
    .all() as DayPushSubscriberRow[];
}

/**
 * Рассылка за календарный день закрыта: успешная доставка или пропуск (слот «на день» уже занят).
 * Планировщик не шлёт повторные попытки и не пишет в чат без запроса.
 */
export function markDayPushClosedForTodaySync(userId: number, calendarDateKey: string): void {
  getOrCreateUser(userId);
  getDb()
    .prepare(
      'UPDATE users SET day_push_last_sent_date = ?, updated_at = ? WHERE telegram_user_id = ?',
    )
    .run(calendarDateKey, isoNow(), userId);
}

/** @deprecated Используйте {@link markDayPushClosedForTodaySync}. */
export const markDayPushSentSync = markDayPushClosedForTodaySync;

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

export type PromoRedeemResult = 'ok' | 'used' | 'invalid' | 'expired' | 'rate_limited';

export type PromoCreateResult = 'ok' | 'exists' | 'invalid';

/** Нормализация кода для хранения и поиска (верхний регистр). */
export function normalizePromoCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (!code || code.length > 64) return null;
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) return null;
  return code;
}

function insertPromoCodeSync(code: string): PromoCreateResult {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM promo_codes WHERE code = ?').get(code);
  if (exists) return 'exists';
  db.prepare(
    `INSERT INTO promo_codes (code, premium_days, valid_from, valid_until)
     VALUES (?, ?, NULL, NULL)`,
  ).run(code, PROMO_PREMIUM_DAYS);
  return 'ok';
}

/** Одноразовый промокод с заданным кодом (тесты, редкие ручные случаи). */
export function createPromoCodeSync(rawCode: string): PromoCreateResult {
  const code = normalizePromoCode(rawCode);
  if (!code) return 'invalid';
  return insertPromoCodeSync(code);
}

export type PromoCodeListRow = {
  code: string;
  premium_days: number;
  redeemed_at: string | null;
  redeemed_by_user_id: number | null;
};

/** Список промокодов: сначала свободные, затем активированные. */
export function listPromoCodesSync(limit = 25): PromoCodeListRow[] {
  return getDb()
    .prepare(
      `SELECT code, premium_days, redeemed_at, redeemed_by_user_id
       FROM promo_codes
       ORDER BY (redeemed_at IS NULL) DESC, code ASC
       LIMIT ?`,
    )
    .all(limit) as PromoCodeListRow[];
}

/** Случайный таро-код + запись в БД. */
export function createPromoCodeAutoSync(): { ok: true; code: string } | { ok: false } {
  for (let i = 0; i < PROMO_CREATE_MAX_ATTEMPTS; i++) {
    const code = generateTarotPromoCode();
    if (insertPromoCodeSync(code) === 'ok') {
      return { ok: true, code };
    }
  }
  return { ok: false };
}

export function tryRedeemPromoCodeSync(userId: number, rawCode: string): PromoRedeemResult {
  if (checkPromoRedeemAttempt(userId) === 'rate_limited') {
    return 'rate_limited';
  }

  const code = normalizePromoCode(rawCode);
  if (!code) return 'invalid';

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
