import { describe, expect, it } from 'vitest';
import {
  middleStripSlotLeft,
  STRIP_GAP_PX,
  tripleStripCanvasDimensions,
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
});
