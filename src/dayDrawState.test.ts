import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import {
  calendarDateInTimezone,
  dayDrawCalendarDate,
  getDayDrawTimezone,
  hasDayDrawSlotUsed,
  tryConsumeDayDrawSlot,
} from './dayDrawState.js';

describe('dayDrawState / calendar date', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('dayDrawCalendarDate: до полуночи UTC+3 остаётся предыдущий календарный день', () => {
    const d = new Date('2026-04-09T20:59:59.000Z');
    expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-09');
  });

  it('dayDrawCalendarDate: после полуночи UTC+3 — следующий день', () => {
    const d = new Date('2026-04-09T21:00:00.000Z');
    expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-10');
  });

  it('default timezone is Europe/Moscow when DAY_DRAW_TIMEZONE unset', () => {
    vi.stubEnv('DAY_DRAW_TIMEZONE', '');
    expect(getDayDrawTimezone()).toBe('Europe/Moscow');
    const d = new Date('2026-04-09T21:00:00.000Z');
    expect(dayDrawCalendarDate(d)).toBe('2026-04-10');
  });

  it('respects DAY_DRAW_TIMEZONE when set', () => {
    vi.stubEnv('DAY_DRAW_TIMEZONE', 'Pacific/Honolulu');
    const d = new Date('2026-04-09T21:30:00.000Z');
    expect(calendarDateInTimezone(d, 'Europe/Moscow')).toBe('2026-04-10');
    expect(dayDrawCalendarDate(d)).toBe('2026-04-09');
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
