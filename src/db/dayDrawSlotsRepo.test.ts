import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './database.js';
import {
  countDayDrawSlotsForUserSync,
  hasDayDrawSlotUsedSync,
  releaseDayDrawSlotSync,
  tryConsumeDayDrawSlotSync,
} from './dayDrawSlotsRepo.js';

describe('dayDrawSlotsRepo', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-slots-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('countDayDrawSlotsForUserSync is zero until slots consumed', () => {
    expect(countDayDrawSlotsForUserSync(77)).toBe(0);
    expect(tryConsumeDayDrawSlotSync(77, '2026-04-01')).toBe(true);
    expect(countDayDrawSlotsForUserSync(77)).toBe(1);
    expect(tryConsumeDayDrawSlotSync(77, '2026-04-02')).toBe(true);
    expect(countDayDrawSlotsForUserSync(77)).toBe(2);
  });

  it('hasDayDrawSlotUsedSync matches stored rows', () => {
    expect(hasDayDrawSlotUsedSync(1, '2026-01-05')).toBe(false);
    tryConsumeDayDrawSlotSync(1, '2026-01-05');
    expect(hasDayDrawSlotUsedSync(1, '2026-01-05')).toBe(true);
  });

  it('releaseDayDrawSlotSync frees slot for retry', () => {
    expect(tryConsumeDayDrawSlotSync(9, '2026-06-01')).toBe(true);
    expect(hasDayDrawSlotUsedSync(9, '2026-06-01')).toBe(true);
    releaseDayDrawSlotSync(9, '2026-06-01');
    expect(hasDayDrawSlotUsedSync(9, '2026-06-01')).toBe(false);
    expect(tryConsumeDayDrawSlotSync(9, '2026-06-01')).toBe(true);
  });

  it('second consume on same day is false', () => {
    expect(tryConsumeDayDrawSlotSync(10, '2026-06-02')).toBe(true);
    expect(tryConsumeDayDrawSlotSync(10, '2026-06-02')).toBe(false);
  });
});
