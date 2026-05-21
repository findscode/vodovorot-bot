import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
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
  it('stacks full previous strip height plus new strip', async () => {
    const prev = await solidFrame(300, 100, '#111111');
    const next = await solidFrame(300, 80, '#222222');
    const stacked = await stackTripletOnPrevious(prev, next);
    const meta = await sharp(stacked.jpeg).metadata();
    expect(meta.height).toBe(100 + 12 + 80);
    expect(meta.width).toBe(300);
  });
});
