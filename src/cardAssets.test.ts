import { describe, expect, it } from 'vitest';
import { cardImageExists, cardJPEGPath, isValidCardId } from './cardAssets.js';

describe('cardAssets', () => {
  it('isValidCardId accepts deck range only', () => {
    expect(isValidCardId(0)).toBe(true);
    expect(isValidCardId(77)).toBe(true);
    expect(isValidCardId(-1)).toBe(false);
    expect(isValidCardId(78)).toBe(false);
    expect(isValidCardId(1.5)).toBe(false);
    expect(isValidCardId(NaN)).toBe(false);
  });

  it('cardJPEGPath rejects out-of-range ids', () => {
    expect(() => cardJPEGPath(-1)).toThrow(RangeError);
    expect(() => cardJPEGPath(78)).toThrow(RangeError);
  });

  it('cardImageExists is false for invalid ids without throwing', () => {
    expect(cardImageExists(-1)).toBe(false);
    expect(cardImageExists(999)).toBe(false);
  });
});
