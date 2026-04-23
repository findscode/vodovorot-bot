import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDefaultDayPushHhmm } from './dayPushConfig.js';
import { isAllowedDayPushHhmm, snapDayPushHhmmToPreset } from './dayPushPresets.js';

describe('dayPushPresets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isAllowedDayPushHhmm', () => {
    expect(isAllowedDayPushHhmm('09:00')).toBe(true);
    expect(isAllowedDayPushHhmm('09:30')).toBe(false);
  });

  it('snapDayPushHhmmToPreset ближайший пресет', () => {
    expect(snapDayPushHhmmToPreset('10:17')).toBe('10:00');
    expect(snapDayPushHhmmToPreset('06:15')).toBe('07:00');
  });

  it('getDefaultDayPushHhmm подстраивает env под пресет', () => {
    vi.stubEnv('DAY_PUSH_DEFAULT_HHMM', '10:17');
    expect(getDefaultDayPushHhmm()).toBe('10:00');
  });
});
