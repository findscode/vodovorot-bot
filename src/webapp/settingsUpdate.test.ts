import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from '../db/database.js';
import {
  getDayPushScheduleForUserSync,
  getOrCreateUser,
  isDayPushEnabledSync,
} from '../db/usersRepo.js';
import { applyWebAppSettingsPatch } from './settingsUpdate.js';

describe('applyWebAppSettingsPatch', () => {
  let dir: string;
  const userId = 9_001_001;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-webapp-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
    getOrCreateUser(userId);
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('enables day push with default time', () => {
    expect(applyWebAppSettingsPatch(userId, { dayPushEnabled: true })).toEqual({ ok: true });
    expect(isDayPushEnabledSync(userId)).toBe(true);
    expect(getDayPushScheduleForUserSync(userId)?.hhmm).toMatch(/^\d{2}:\d{2}$/);
  });

  it('rejects invalid hhmm', () => {
    expect(applyWebAppSettingsPatch(userId, { dayPushHhmm: '99:99' })).toEqual({
      ok: false,
      error: 'invalid_hhmm',
    });
  });
});
