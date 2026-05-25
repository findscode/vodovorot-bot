import { describe, expect, it } from 'vitest';
import { parseWebAppLaunchPayload, parseWebAppLaunchBody } from './webappLaunchPayload.js';

describe('parseWebAppLaunchPayload', () => {
  it('parses day, spread, deep actions', () => {
    expect(parseWebAppLaunchPayload('{"action":"day"}')).toBe('day');
    expect(parseWebAppLaunchPayload('{"action":"spread"}')).toBe('spread');
    expect(parseWebAppLaunchPayload('{"action":"deep"}')).toBe('deep');
  });

  it('returns null for invalid sendData payload', () => {
    expect(parseWebAppLaunchPayload('')).toBeNull();
    expect(parseWebAppLaunchPayload('not-json')).toBeNull();
    expect(parseWebAppLaunchPayload('{"action":"promo"}')).toBeNull();
  });

  it('parseWebAppLaunchBody accepts JSON object', () => {
    expect(parseWebAppLaunchBody({ action: 'deep' })).toBe('deep');
    expect(parseWebAppLaunchBody({ action: 'invalid' })).toBeNull();
  });
});
