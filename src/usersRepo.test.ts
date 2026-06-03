import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROMO_REDEEM_MAX_ATTEMPTS } from './promoConfig.js';
import { resetPromoRedeemLimitsForTests } from './promoRedeemLimit.js';
import { closeDatabase, getDb, initDatabase } from './db/database.js';
import {
  createPromoCodeAutoSync,
  createPromoCodeSync,
  extendPremiumByDaysSync,
  listPromoCodesSync,
  getActivePremiumUntilSync,
  getDayPushScheduleForUserSync,
  normalizePromoCode,
  disableAllDayPushSubscriptionsSync,
  setDayPushEnabled,
  setDayPushLocalHhmmSync,
  tryRedeemPromoCodeSync,
  userHasPremiumOrAdminSync,
} from './db/usersRepo.js';

describe('usersRepo / promo', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-user-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
    getDb()
      .prepare(
        `INSERT INTO promo_codes (code, premium_days, valid_from, valid_until)
         VALUES ('TEST-ONCE', 7, NULL, NULL)`,
      )
      .run();
  });

  afterEach(async () => {
    resetPromoRedeemLimitsForTests();
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('redeems once and extends premium', () => {
    expect(tryRedeemPromoCodeSync(1001, 'TEST-ONCE')).toBe('ok');
    expect(userHasPremiumOrAdminSync(1001)).toBe(true);
    expect(tryRedeemPromoCodeSync(1002, 'TEST-ONCE')).toBe('used');
  });

  it('createPromoCodeSync normalizes case, fixed 31 days, rejects duplicate', () => {
    expect(normalizePromoCode('  ab-c1  ')).toBe('AB-C1');
    expect(createPromoCodeSync('new-code')).toBe('ok');
    expect(createPromoCodeSync('NEW-CODE')).toBe('exists');
    expect(tryRedeemPromoCodeSync(1003, 'new-code')).toBe('ok');
    const row = getDb()
      .prepare('SELECT premium_days FROM promo_codes WHERE code = ?')
      .get('NEW-CODE') as { premium_days: number };
    expect(row.premium_days).toBe(31);
  });

  it('createPromoCodeAutoSync generates unique tarot-style code with secret suffix', () => {
    const a = createPromoCodeAutoSync();
    const b = createPromoCodeAutoSync();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.code.split('-').length).toBeGreaterThanOrEqual(3);
      expect(a.code).not.toBe(b.code);
    }
  });

  it('tryRedeemPromoCodeSync rate limits brute force', () => {
    createPromoCodeSync('RATE-TEST');
    for (let i = 0; i < PROMO_REDEEM_MAX_ATTEMPTS; i++) {
      tryRedeemPromoCodeSync(8000, 'WRONG-CODE');
    }
    expect(tryRedeemPromoCodeSync(8000, 'RATE-TEST')).toBe('rate_limited');
  });

  it('listPromoCodesSync shows redemption owner', () => {
    createPromoCodeSync('LIST-FREE');
    createPromoCodeSync('LIST-USED');
    tryRedeemPromoCodeSync(9001, 'LIST-USED');
    const rows = listPromoCodesSync(10);
    const used = rows.find((r) => r.code === 'LIST-USED');
    const free = rows.find((r) => r.code === 'LIST-FREE');
    expect(used?.redeemed_by_user_id).toBe(9001);
    expect(free?.redeemed_at).toBeNull();
  });

  it('disableAllDayPushSubscriptionsSync сбрасывает подписки', () => {
    setDayPushEnabled(3010, true, 'Europe/Moscow', '09:00');
    setDayPushEnabled(3011, true, 'Europe/Moscow', '10:00');
    expect(disableAllDayPushSubscriptionsSync()).toBe(2);
    expect(disableAllDayPushSubscriptionsSync()).toBe(0);
    expect(getDayPushScheduleForUserSync(3010)).toBeNull();
  });

  it('getDayPushScheduleForUserSync после включения подписки', () => {
    setDayPushEnabled(3001, true, 'Europe/Moscow', '10:00');
    expect(getDayPushScheduleForUserSync(3001)).toEqual({
      hhmm: '10:00',
      timezoneIana: 'Europe/Moscow',
    });
    setDayPushEnabled(3001, false, 'Europe/Moscow');
    expect(getDayPushScheduleForUserSync(3001)).toBeNull();
  });

  it('setDayPushLocalHhmmSync только при включённой подписке и валидном ЧЧ:ММ', () => {
    expect(setDayPushLocalHhmmSync(3002, '09:00')).toBe(false);
    setDayPushEnabled(3002, true, 'Europe/Moscow', '09:00');
    expect(setDayPushLocalHhmmSync(3002, '21:00')).toBe(true);
    expect(getDayPushScheduleForUserSync(3002)?.hhmm).toBe('21:00');
    expect(setDayPushLocalHhmmSync(3002, '9:30')).toBe(true);
    expect(getDayPushScheduleForUserSync(3002)?.hhmm).toBe('09:30');
    expect(setDayPushLocalHhmmSync(3002, '25:00')).toBe(false);
  });

  it('getActivePremiumUntilSync возвращает дату в будущем', () => {
    extendPremiumByDaysSync(4001, 5);
    const d = getActivePremiumUntilSync(4001);
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBeGreaterThan(Date.now());
  });

  it('stacking premium adds days from current end', () => {
    extendPremiumByDaysSync(2000, 3);
    const until1 = (
      getDb().prepare('SELECT premium_until FROM users WHERE telegram_user_id = 2000').get() as {
        premium_until: string;
      }
    ).premium_until;
    extendPremiumByDaysSync(2000, 2);
    const until2 = (
      getDb().prepare('SELECT premium_until FROM users WHERE telegram_user_id = 2000').get() as {
        premium_until: string;
      }
    ).premium_until;
    expect(new Date(until2).getTime()).toBeGreaterThan(new Date(until1).getTime());
  });
});
