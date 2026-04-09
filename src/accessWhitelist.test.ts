import { describe, expect, it } from 'vitest';
import { parseAllowlistFromEnvString } from './accessWhitelist.js';

describe('accessWhitelist', () => {
  it('parses comma-separated ids', () => {
    const s = parseAllowlistFromEnvString('123, 456');
    expect([...s].sort((a, b) => a - b)).toEqual([123, 456]);
  });

  it('parses space and semicolon separators', () => {
    const s = parseAllowlistFromEnvString(' 1 ; 2 \n 3 ');
    expect([...s].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('deduplicates ids', () => {
    const s = parseAllowlistFromEnvString('10,10,10');
    expect(s.size).toBe(1);
    expect(s.has(10)).toBe(true);
  });

  it('rejects invalid tokens', () => {
    expect(() => parseAllowlistFromEnvString('abc')).toThrow();
    expect(() => parseAllowlistFromEnvString('1,x')).toThrow();
    expect(() => parseAllowlistFromEnvString('')).toThrow();
    expect(() => parseAllowlistFromEnvString('   ')).toThrow();
  });

  it('rejects non-positive ids', () => {
    expect(() => parseAllowlistFromEnvString('0')).toThrow();
    expect(() => parseAllowlistFromEnvString('-1')).toThrow();
  });
});
