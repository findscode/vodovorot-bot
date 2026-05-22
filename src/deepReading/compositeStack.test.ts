import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { compositeLayersOnBlack } from '../compositeBackground.js';
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

  it('fills vertical gap between strips with black', async () => {
    const redTop = await sharp({
      create: { width: 100, height: 30, channels: 3, background: '#ff0000' },
    })
      .png()
      .toBuffer();
    const prevPng = await compositeLayersOnBlack(100, 50, [{ input: redTop, left: 0, top: 0 }]);
    const prev: CompositeFrame = { png: prevPng, width: 100, height: 50 };
    const next = await solidFrame(100, 30, 0, 0, 255);
    const stacked = await stackTripletOnPrevious(prev, next, 1);
    const gapY = 35;
    const { data } = await sharp(stacked.png).raw().toBuffer({ resolveWithObject: true });
    const i = (gapY * 100 + 50) * 3;
    expect(data[i]).toBe(0);
    expect(data[i + 1]).toBe(0);
    expect(data[i + 2]).toBe(0);
  });
});
