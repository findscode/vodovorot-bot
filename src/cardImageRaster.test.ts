import { describe, expect, it } from 'vitest';
import { DECK } from './deck.js';
import { rasterCardForStrip } from './cardImageRaster.js';
import { STRIP_CARD_HEIGHT } from './spreadComposite.js';

describe('rasterCardForStrip', () => {
  it('fits card to strip height preserving alpha PNG', async () => {
    const raster = await rasterCardForStrip({ card: DECK[0]!, reversed: false }, STRIP_CARD_HEIGHT);
    expect(raster.height).toBe(STRIP_CARD_HEIGHT);
    expect(raster.width).toBeGreaterThan(0);
    expect(raster.buffer.length).toBeGreaterThan(100);
  });
});
