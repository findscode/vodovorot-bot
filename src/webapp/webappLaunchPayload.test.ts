import { describe, expect, it } from 'vitest';
import { parseWebAppLaunchPayload } from './webappLaunchPayload.js';

describe('parseWebAppLaunchPayload', () => {
  it('parses day, spread, deep actions', () => {
    expect(parseWebAppLaunchPayload('{"action":"day"}')).toBe('day');
    expect(parseWebAppLaunchPayload('{"action":"spread"}')).toBe('spread');
    expect(parseWebAppLaunchPayload('{"action":"deep"}')).toBe('deep');
  });

  it('returns null for invalid payload', () => {
    expect(parseWebAppLaunchPayload('')).toBeNull();
    expect(parseWebAppLaunchPayload('not-json')).toBeNull();
    expect(parseWebAppLaunchPayload('{"action":"promo"}')).toBeNull();
  });
});
