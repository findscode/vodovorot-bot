import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { setUserAdminSync } from './db/usersRepo.js';
import { hasFullSpreadAccess } from './accessResolve.js';
import { setAccessWhitelist } from './runtimeConfig.js';

describe('accessResolve', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-acc-'));
    closeDatabase();
    initDatabase(join(dir, 'a.db'));
  });

  afterEach(async () => {
    setAccessWhitelist(null);
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('whitelist off: everyone has spread access', () => {
    setAccessWhitelist(null);
    expect(hasFullSpreadAccess(999)).toBe(true);
  });

  it('whitelist on: listed id has access', () => {
    setAccessWhitelist(new Set([42]));
    expect(hasFullSpreadAccess(42)).toBe(true);
    expect(hasFullSpreadAccess(99)).toBe(false);
  });

  it('whitelist on: admin in DB has access', () => {
    setAccessWhitelist(new Set([1]));
    setUserAdminSync(77, true);
    expect(hasFullSpreadAccess(77)).toBe(true);
  });
});
