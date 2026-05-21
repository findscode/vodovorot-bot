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
  it('overlays new strip on previous with card-height offset', async () => {
    const prev = await solidFrame(300, 100, '#111111');
    const next = await solidFrame(300, 80, '#222222');
    const stacked = await stackTripletOnPrevious(prev, next);
    const meta = await sharp(stacked.jpeg).metadata();
    const offsetY = Math.round(STRIP_CARD_HEIGHT * DEEP_STRIP_STACK_OFFSET_FRACTION);
    expect(meta.height).toBe(Math.max(100, offsetY + 80));
    expect(meta.width).toBe(300);
    expect(offsetY).toBeGreaterThanOrEqual(Math.round(STRIP_CARD_HEIGHT * 0.1));
    expect(offsetY).toBeLessThanOrEqual(Math.round(STRIP_CARD_HEIGHT * 0.15));
  });
});
