import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import {
  calendarDateInTimezone,
  hasDayDrawSlotUsed,
  moscowCalendarDate,
  tryConsumeDayDrawSlot,
} from './dayDrawState.js';

describe('dayDrawState / calendar date', () => {
  it('moscowCalendarDate: до полуночи по Москве остаётся предыдущий календарный день', () => {
    const d = new Date('2026-04-09T20:59:59.000Z');
    expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-09');
  });

  it('moscowCalendarDate: после полуночи по Москве — следующий день', () => {
    const d = new Date('2026-04-09T21:00:00.000Z');
    expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-10');
  });

  it('respects DAY_DRAW_TIMEZONE when set', () => {
    const prev = process.env.DAY_DRAW_TIMEZONE;
    process.env.DAY_DRAW_TIMEZONE = 'Pacific/Honolulu';
    try {
      const d = new Date('2026-04-09T21:30:00.000Z');
      expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-10');
      expect(moscowCalendarDate(d)).toBe('2026-04-09');
    } finally {
      if (prev === undefined) delete process.env.DAY_DRAW_TIMEZONE;
      else process.env.DAY_DRAW_TIMEZONE = prev;
    }
  });
});

describe('dayDrawState / sqlite slots', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-day-'));
    process.env.DAY_DRAW_STATE_PATH = join(dir, 'state.json');
    closeDatabase();
    initDatabase(join(dir, 'slots.db'));
  });

  afterEach(async () => {
    closeDatabase();
    delete process.env.DAY_DRAW_STATE_PATH;
    await rm(dir, { recursive: true, force: true });
  });

  it('allows only one slot per user per calendar day key', async () => {
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(false);
  });

  it('hasDayDrawSlotUsed reflects consumed slot', async () => {
    expect(await hasDayDrawSlotUsed(5, '2026-05-01')).toBe(false);
    expect(await tryConsumeDayDrawSlot(5, '2026-05-01')).toBe(true);
    expect(await hasDayDrawSlotUsed(5, '2026-05-01')).toBe(true);
    expect(await hasDayDrawSlotUsed(5, '2026-05-02')).toBe(false);
  });

  it('isolates users on the same day', async () => {
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(2, '2026-04-10')).toBe(true);
  });

  it('allows again on the next calendar day key', async () => {
    expect(await tryConsumeDayDrawSlot(3, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(3, '2026-04-11')).toBe(true);
  });
});
