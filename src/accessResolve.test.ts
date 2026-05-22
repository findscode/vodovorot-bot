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
import { hasFullSpreadAccess } from './accessResolve.js';

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

  it('basic user without premium has no spread access', () => {
    expect(hasFullSpreadAccess(999)).toBe(false);
  });

  it('admin in DB has spread access', () => {
    setUserAdminSync(77, true);
    expect(hasFullSpreadAccess(77)).toBe(true);
  });

  it('active premium grants spread access', () => {
    extendPremiumByDaysSync(42, 7);
    expect(hasFullSpreadAccess(42)).toBe(true);
  });

  it('promo redeem grants spread access', () => {
    createPromoCodeSync('TEST-1');
    expect(tryRedeemPromoCodeSync(55, 'test-1')).toBe('ok');
    expect(hasFullSpreadAccess(55)).toBe(true);
  });
});
