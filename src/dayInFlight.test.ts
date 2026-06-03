import { afterEach, describe, expect, it } from 'vitest';
import { clearDayInFlightForTests, isDayInFlight, tryMarkDayInFlight } from './dayInFlight.js';

describe('dayInFlight', () => {
  afterEach(() => {
    clearDayInFlightForTests();
  });

  it('tryMarkDayInFlight allows only one concurrent mark per user', () => {
    expect(tryMarkDayInFlight(42)).toBe(true);
    expect(isDayInFlight(42)).toBe(true);
    expect(tryMarkDayInFlight(42)).toBe(false);
    expect(tryMarkDayInFlight(43)).toBe(true);
  });
});
