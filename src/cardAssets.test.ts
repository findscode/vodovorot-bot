import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  CARD_ASSET_HEIGHT,
  CARD_ASSET_WIDTH,
  cardAssetPath,
  cardImageExists,
  cardJPEGPath,
  isValidCardId,
} from './cardAssets.js';

describe('cardAssets', () => {
  it('isValidCardId accepts deck range only', () => {
    expect(isValidCardId(0)).toBe(true);
    expect(isValidCardId(77)).toBe(true);
    expect(isValidCardId(-1)).toBe(false);
    expect(isValidCardId(78)).toBe(false);
    expect(isValidCardId(1.5)).toBe(false);
    expect(isValidCardId(NaN)).toBe(false);
  });

  it('cardAssetPath rejects out-of-range ids', () => {
    expect(() => cardAssetPath(-1)).toThrow(RangeError);
    expect(() => cardAssetPath(78)).toThrow(RangeError);
    expect(() => cardJPEGPath(78)).toThrow(RangeError);
  });

  it('cardImageExists is false for invalid ids without throwing', () => {
    expect(cardImageExists(-1)).toBe(false);
    expect(cardImageExists(999)).toBe(false);
  });

  it('deck PNG has canvas size and transparent corners', async () => {
    const buf = await readFile(cardAssetPath(0));
    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(CARD_ASSET_WIDTH);
    expect(meta.height).toBe(CARD_ASSET_HEIGHT);
    expect(meta.hasAlpha).toBe(true);
    const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBeLessThan(32);
  });
});
