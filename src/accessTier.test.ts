import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  canUseFullDeepFinal,
  deepMaxTripletsForTier,
  resolveAccessTier,
  tierLabelForAdmin,
} from './accessTier.js';
import { closeDatabase, initDatabase } from './db/database.js';
import { extendPremiumByDaysSync, setUserAdminSync } from './db/usersRepo.js';

describe('accessTier', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-tier-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('resolves admin over premium', () => {
    setUserAdminSync(1, true);
    extendPremiumByDaysSync(1, 7);
    expect(resolveAccessTier(1)).toBe('admin');
  });

  it('resolves premium and basic', () => {
    extendPremiumByDaysSync(2, 3);
    expect(resolveAccessTier(2)).toBe('premium');
    expect(resolveAccessTier(999)).toBe('basic');
  });

  it('model C limits for basic tier', () => {
    expect(deepMaxTripletsForTier('basic')).toBe(3);
    expect(canUseFullDeepFinal('basic')).toBe(false);
    expect(deepMaxTripletsForTier('premium')).toBe(7);
    expect(canUseFullDeepFinal('premium')).toBe(true);
    expect(tierLabelForAdmin('basic')).toBe('basic');
  });
});
