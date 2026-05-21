import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  CARD_ASSET_HEIGHT,
  CARD_ASSET_WIDTH,
  CARD_CORNER_RADIUS_PX,
  normalizeCardImageBuffer,
} from './cardImageNormalize.js';

describe('normalizeCardImageBuffer', () => {
  it('outputs fixed-size PNG with alpha', async () => {
    const src = await sharp({
      create: {
        width: 200,
        height: 350,
        channels: 3,
        background: '#cccccc',
      },
    })
      .jpeg()
      .toBuffer();
    const out = await normalizeCardImageBuffer(src);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(CARD_ASSET_WIDTH);
    expect(meta.height).toBe(CARD_ASSET_HEIGHT);
    expect(meta.hasAlpha).toBe(true);
    expect(CARD_CORNER_RADIUS_PX).toBe(16);
  });
});
