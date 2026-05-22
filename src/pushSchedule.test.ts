import { describe, expect, it } from 'vitest';
import { isAtOrPastLocalHm, isValidIanaTimeZone, localWallHm } from './pushSchedule.js';

describe('pushSchedule', () => {
  it('09:00 Europe/Moscow: до 09:00 по Москве ещё рано (UTC 05:59 при UTC+3)', () => {
    const d = new Date('2026-04-09T05:59:00.000Z');
    expect(isAtOrPastLocalHm(d, 'Europe/Moscow', '09:00')).toBe(false);
  });

  it('09:00 Europe/Moscow: с 09:00 по Москве — уже время (UTC 06:00 при UTC+3)', () => {
    const d = new Date('2026-04-09T06:00:00.000Z');
    expect(isAtOrPastLocalHm(d, 'Europe/Moscow', '09:00')).toBe(true);
  });

  it('isValidIanaTimeZone rejects garbage', () => {
    expect(isValidIanaTimeZone('Europe/Moscow')).toBe(true);
    expect(isValidIanaTimeZone('Not/A_Zone')).toBe(false);
  });

  it('localWallHm normalizes hour 24 to 0 at midnight', () => {
    const d = new Date('2026-01-15T21:00:00.000Z');
    const hm = localWallHm(d, 'Europe/Moscow');
    expect(hm.h).toBeGreaterThanOrEqual(0);
    expect(hm.h).toBeLessThan(24);
  });
});
