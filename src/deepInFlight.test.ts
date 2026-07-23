import { afterEach, describe, expect, it } from 'vitest';
import { clearDeepInFlightForTests, isDeepInFlight, tryMarkDeepInFlight } from './deepInFlight.js';

describe('deepInFlight', () => {
  afterEach(() => {
    clearDeepInFlightForTests();
  });

  it('tryMarkDeepInFlight allows only one concurrent mark per user', () => {
    expect(tryMarkDeepInFlight(42)).toBe(true);
    expect(isDeepInFlight(42)).toBe(true);
    expect(tryMarkDeepInFlight(42)).toBe(false);
    expect(tryMarkDeepInFlight(43)).toBe(true);
  });
});
