import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { STRIP_CARD_HEIGHT } from '../spreadComposite.js';
import { DEEP_STRIP_STACK_OFFSET_FRACTION } from './constants.js';
import { stackTripletOnPrevious, type CompositeFrame } from './compositeStack.js';

function solidFrame(w: number, h: number, color: string): Promise<CompositeFrame> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer()
    .then((jpeg) => ({ jpeg, width: w, height: h }));
}

describe('stackTripletOnPrevious', () => {
  const step = Math.round(STRIP_CARD_HEIGHT * DEEP_STRIP_STACK_OFFSET_FRACTION);

  it('overlays 2nd triplet at one step from top', async () => {
    const prev = await solidFrame(300, 100, '#111111');
    const next = await solidFrame(300, 80, '#222222');
    const stacked = await stackTripletOnPrevious(prev, next, 1);
    const meta = await sharp(stacked.jpeg).metadata();
    expect(meta.height).toBe(Math.max(100, step + 80));
    expect(meta.width).toBe(300);
  });

  it('overlays 3rd triplet at two steps from top', async () => {
    const prev = await solidFrame(300, 120, '#111111');
    const next = await solidFrame(300, 80, '#222222');
    const stacked = await stackTripletOnPrevious(prev, next, 2);
    const meta = await sharp(stacked.jpeg).metadata();
    expect(meta.height).toBe(Math.max(120, 2 * step + 80));
  });
});
