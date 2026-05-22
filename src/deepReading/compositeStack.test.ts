import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { STRIP_CARD_HEIGHT } from '../spreadComposite.js';
import { DEEP_STRIP_STACK_OFFSET_FRACTION } from './constants.js';
import { stackTripletOnPrevious, type CompositeFrame } from './compositeStack.js';

function solidFrame(
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
): Promise<CompositeFrame> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 255 } },
  })
    .png()
    .toBuffer()
    .then((png) => ({ png, width: w, height: h }));
}

describe('stackTripletOnPrevious', () => {
  const step = Math.round(STRIP_CARD_HEIGHT * DEEP_STRIP_STACK_OFFSET_FRACTION);

  it('overlays 2nd triplet at one step from top', async () => {
    const prev = await solidFrame(300, 100, 0x11, 0x11, 0x11);
    const next = await solidFrame(300, 80, 0x22, 0x22, 0x22);
    const stacked = await stackTripletOnPrevious(prev, next, 1);
    const meta = await sharp(stacked.png).metadata();
    expect(meta.height).toBe(Math.max(100, step + 80));
    expect(meta.width).toBe(300);
  });

  it('overlays 3rd triplet at two steps from top', async () => {
    const prev = await solidFrame(300, 120, 0x11, 0x11, 0x11);
    const next = await solidFrame(300, 80, 0x22, 0x22, 0x22);
    const stacked = await stackTripletOnPrevious(prev, next, 2);
    const meta = await sharp(stacked.png).metadata();
    expect(meta.height).toBe(Math.max(120, 2 * step + 80));
  });

  it('preserves transparent background between layers', async () => {
    const prev = await solidFrame(100, 30, 255, 0, 0);
    const next = await solidFrame(100, 30, 0, 0, 255);
    const stacked = await stackTripletOnPrevious(prev, next, 1);
    const gapY = 30;
    const { data, info } = await sharp(stacked.png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaIdx = (gapY * (info.width ?? 100) + 50) * 4 + 3;
    expect(data[alphaIdx]).toBeLessThan(16);
  });
});
