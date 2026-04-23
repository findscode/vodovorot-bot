import { describe, expect, it } from 'vitest';
import { isAtOrPastLocalHm } from './pushSchedule.js';

describe('pushSchedule', () => {
  it('09:00 Europe/Moscow: до 09:00 по Москве ещё рано (UTC 05:59 при UTC+3)', () => {
    const d = new Date('2026-04-09T05:59:00.000Z');
    expect(isAtOrPastLocalHm(d, 'Europe/Moscow', '09:00')).toBe(false);
  });

  it('09:00 Europe/Moscow: с 09:00 по Москве — уже время (UTC 06:00 при UTC+3)', () => {
    const d = new Date('2026-04-09T06:00:00.000Z');
    expect(isAtOrPastLocalHm(d, 'Europe/Moscow', '09:00')).toBe(true);
  });
});
