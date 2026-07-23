import { describe, expect, it, beforeEach } from 'vitest';
import { clearDayInFlight, tryMarkDayInFlight } from '../dayInFlight.js';
import { clearDeepInFlight, tryMarkDeepInFlight } from '../deepInFlight.js';
import { clearSpreadInFlight, tryMarkSpreadInFlight } from '../spreadInFlight.js';
import { shouldSuppressUnhandledDuringReading } from './registerErrorHandler.js';

describe('shouldSuppressUnhandledDuringReading', () => {
  beforeEach(() => {
    clearDeepInFlight(1);
    clearSpreadInFlight(1);
    clearDayInFlight(1);
  });

  it('is false without user or in-flight', () => {
    expect(shouldSuppressUnhandledDuringReading(undefined)).toBe(false);
    expect(shouldSuppressUnhandledDuringReading(1)).toBe(false);
  });

  it('is true while spread/deep/day in-flight', () => {
    expect(tryMarkSpreadInFlight(1)).toBe(true);
    expect(shouldSuppressUnhandledDuringReading(1)).toBe(true);
    clearSpreadInFlight(1);

    expect(tryMarkDeepInFlight(1)).toBe(true);
    expect(shouldSuppressUnhandledDuringReading(1)).toBe(true);
    clearDeepInFlight(1);

    expect(tryMarkDayInFlight(1)).toBe(true);
    expect(shouldSuppressUnhandledDuringReading(1)).toBe(true);
  });
});
