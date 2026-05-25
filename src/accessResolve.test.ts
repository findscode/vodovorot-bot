import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import {
  extendPremiumByDaysSync,
  setUserAdminSync,
  tryRedeemPromoCodeSync,
  createPromoCodeSync,
} from './db/usersRepo.js';
import {
  canUseSpread,
  hasFullSpreadAccess,
  hasUnlimitedSpreadAccess,
  remainingSpreadDrawsForUser,
} from './accessResolve.js';
import { tryConsumeSpreadDrawSlotSync } from './db/spreadDrawSlotsRepo.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';

describe('accessResolve', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-acc-'));
    closeDatabase();
    initDatabase(join(dir, 'a.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('basic user can use spread until three draws consumed per day', () => {
    const day = dayDrawCalendarDate();
    expect(hasUnlimitedSpreadAccess(999)).toBe(false);
    expect(hasFullSpreadAccess(999)).toBe(false);
    expect(canUseSpread(999)).toBe(true);
    expect(remainingSpreadDrawsForUser(999)).toBe(SPREAD_MAX_FOR_BASIC);
    for (let i = 0; i < SPREAD_MAX_FOR_BASIC; i++) {
      tryConsumeSpreadDrawSlotSync(999, day);
    }
    expect(canUseSpread(999)).toBe(false);
    expect(remainingSpreadDrawsForUser(999)).toBe(0);
  });

  it('admin has unlimited spread access', () => {
    setUserAdminSync(77, true);
    expect(hasUnlimitedSpreadAccess(77)).toBe(true);
    expect(canUseSpread(77)).toBe(true);
    expect(remainingSpreadDrawsForUser(77)).toBeNull();
  });

  it('active premium grants unlimited spread access', () => {
    extendPremiumByDaysSync(42, 7);
    expect(hasUnlimitedSpreadAccess(42)).toBe(true);
    expect(canUseSpread(42)).toBe(true);
  });

  it('promo redeem grants unlimited spread access', () => {
    createPromoCodeSync('TEST-1');
    expect(tryRedeemPromoCodeSync(55, 'test-1')).toBe('ok');
    expect(hasUnlimitedSpreadAccess(55)).toBe(true);
  });
});
