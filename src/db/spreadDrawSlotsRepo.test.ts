import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './database.js';
import {
  countSpreadDrawsForUserOnDaySync,
  releaseSpreadDrawSlotByIdSync,
  tryConsumeSpreadDrawSlotSync,
} from './spreadDrawSlotsRepo.js';
import { SPREAD_MAX_FOR_BASIC } from '../spreadConstants.js';

describe('spreadDrawSlotsRepo', () => {
  let dir: string;
  const day = '2026-05-25';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-spread-slots-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('countSpreadDrawsForUserOnDaySync tracks consumed rows per day', () => {
    expect(countSpreadDrawsForUserOnDaySync(1, day)).toBe(0);
    tryConsumeSpreadDrawSlotSync(1, day);
    expect(countSpreadDrawsForUserOnDaySync(1, day)).toBe(1);
    expect(countSpreadDrawsForUserOnDaySync(1, '2026-05-26')).toBe(0);
  });

  it('releaseSpreadDrawSlotByIdSync frees slot for retry', () => {
    const id = tryConsumeSpreadDrawSlotSync(9, day);
    expect(id).not.toBeNull();
    releaseSpreadDrawSlotByIdSync(id!);
    expect(countSpreadDrawsForUserOnDaySync(9, day)).toBe(0);
  });

  it(`allows up to ${SPREAD_MAX_FOR_BASIC} consumes per calendar day`, () => {
    for (let i = 0; i < SPREAD_MAX_FOR_BASIC; i++) {
      expect(tryConsumeSpreadDrawSlotSync(10, day)).not.toBeNull();
    }
    expect(tryConsumeSpreadDrawSlotSync(10, day)).toBeNull();
    expect(countSpreadDrawsForUserOnDaySync(10, day)).toBe(SPREAD_MAX_FOR_BASIC);
  });
});
