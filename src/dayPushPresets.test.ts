import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDefaultDayPushHhmm } from './dayPushConfig.js';
import { isAllowedDayPushHhmm, normalizeDayPushHhmm } from './dayPushPresets.js';

describe('dayPushPresets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizeDayPushHhmm', () => {
    expect(normalizeDayPushHhmm('9:05')).toBe('09:05');
    expect(normalizeDayPushHhmm(' 14:30 ')).toBe('14:30');
    expect(normalizeDayPushHhmm('24:00')).toBeNull();
    expect(normalizeDayPushHhmm('12:60')).toBeNull();
  });

  it('isAllowedDayPushHhmm', () => {
    expect(isAllowedDayPushHhmm('09:00')).toBe(true);
    expect(isAllowedDayPushHhmm('09:30')).toBe(true);
    expect(isAllowedDayPushHhmm('bad')).toBe(false);
  });

  it('getDefaultDayPushHhmm берёт валидное время из env как есть', () => {
    vi.stubEnv('DAY_PUSH_DEFAULT_HHMM', '10:17');
    expect(getDefaultDayPushHhmm()).toBe('10:17');
  });
});
