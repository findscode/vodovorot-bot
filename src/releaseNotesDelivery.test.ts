import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { getLastSeenReleaseSync, markReleaseSeenSync } from './db/usersRepo.js';
import { APP_RELEASE_VERSION } from './releaseNotes.js';

describe('release notes / usersRepo', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-release-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('markReleaseSeenSync persists version', () => {
    expect(getLastSeenReleaseSync(42)).toBeNull();
    markReleaseSeenSync(42, APP_RELEASE_VERSION);
    expect(getLastSeenReleaseSync(42)).toBe(APP_RELEASE_VERSION);
  });
});
