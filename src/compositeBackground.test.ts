import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { CARDS_ASSETS_DIR } from './cardAssets.js';
import { compositeLayersOnBlack, flattenCardPngOnBlack } from './compositeBackground.js';

describe('compositeLayersOnBlack', () => {
  it('uses opaque black where overlays do not cover', async () => {
    const card = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 255 },
      },
    })
      .png()
      .toBuffer();
    const out = await compositeLayersOnBlack(20, 10, [{ input: card, left: 5, top: 0 }]);
    const meta = await sharp(out).metadata();
    expect(meta.channels).toBe(3);
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  it('flattenCardPngOnBlack uses real deck asset', async () => {
    const buf = await flattenCardPngOnBlack(join(CARDS_ASSETS_DIR, '31.png'));
    const meta = await sharp(buf).metadata();
    expect(meta.channels).toBe(3);
    expect((meta.width ?? 0) > 0).toBe(true);
  });

  it('shows black through transparent corners of overlay', async () => {
    const card = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
              <rect x="2" y="2" width="16" height="16" rx="4" ry="4" fill="white"/>
            </svg>`,
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
    const out = await compositeLayersOnBlack(20, 20, [{ input: card, left: 0, top: 0 }]);
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });
});
