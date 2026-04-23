import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDb, initDatabase } from './db/database.js';
import {
  extendPremiumByDaysSync,
  getActivePremiumUntilSync,
  getDayPushScheduleForUserSync,
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
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('redeems once and extends premium', () => {
    expect(tryRedeemPromoCodeSync(1001, 'TEST-ONCE')).toBe('ok');
    expect(userHasPremiumOrAdminSync(1001)).toBe(true);
    expect(tryRedeemPromoCodeSync(1002, 'TEST-ONCE')).toBe('used');
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
    const until1 = (getDb().prepare('SELECT premium_until FROM users WHERE telegram_user_id = 2000').get() as {
      premium_until: string;
    }).premium_until;
    extendPremiumByDaysSync(2000, 2);
    const until2 = (getDb().prepare('SELECT premium_until FROM users WHERE telegram_user_id = 2000').get() as {
      premium_until: string;
    }).premium_until;
    expect(new Date(until2).getTime()).toBeGreaterThan(new Date(until1).getTime());
  });
});
