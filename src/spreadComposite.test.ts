import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { DECK } from './deck.js';
import {
  middleStripSlotLeft,
  STRIP_GAP_PX,
  tripleStripCanvasDimensions,
  tripletStripFrame,
} from './spreadComposite.js';

describe('spreadComposite layout', () => {
  it('tripleStripCanvasDimensions matches three slots and gaps', () => {
    const slotW = 400;
    const slotH = 920;
    expect(tripleStripCanvasDimensions(slotW, slotH)).toEqual({
      width: slotW * 3 + STRIP_GAP_PX * 2,
      height: slotH,
    });
  });

  it('middleStripSlotLeft is center slot offset', () => {
    expect(middleStripSlotLeft(400)).toBe(400 + STRIP_GAP_PX);
  });

  it('tripletStripFrame renders three cards on black RGB canvas', async () => {
    const drawn = [
      { card: DECK[0]!, reversed: false },
      { card: DECK[1]!, reversed: false },
      { card: DECK[2]!, reversed: true },
    ] as const;
    const { png, width, height } = await tripletStripFrame(drawn);
    expect(width).toBeGreaterThan(100);
    expect(height).toBeGreaterThan(100);
    const meta = await sharp(png).metadata();
    expect(meta.channels).toBe(3);
    const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });
});
