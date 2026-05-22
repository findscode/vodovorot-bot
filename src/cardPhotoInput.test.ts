import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CARDS_ASSETS_DIR } from './cardAssets.js';
import { flattenCardPngOnBlack } from './compositeBackground.js';

describe('cardPhotoInput pipeline', () => {
  it('flattenCardPngOnBlack produces opaque black corners', async () => {
    const path = join(CARDS_ASSETS_DIR, '00.png');
    const buf = await flattenCardPngOnBlack(path);
    const meta = await sharp(buf).metadata();
    expect(meta.channels).toBe(3);
    const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  it('rotate 180 before flatten keeps output size', async () => {
    const path = join(CARDS_ASSETS_DIR, '00.png');
    const raw = await readFile(path);
    const upright = await flattenCardPngOnBlack(path);
    const reversed = await flattenCardPngOnBlack(path, 180);
    const upMeta = await sharp(upright).metadata();
    const revMeta = await sharp(reversed).metadata();
    const srcMeta = await sharp(raw).metadata();
    expect(upMeta.width).toBe(srcMeta.width);
    expect(revMeta.width).toBe(srcMeta.width);
  });
});
