import sharp from 'sharp';
import { cardAssetPath } from './cardAssets.js';
import type { DrawnCard } from './deck.js';

export type RasterCard = { buffer: Buffer; width: number; height: number };

/** PNG карты для композита (прозрачный фон, единый исходный холст). */
export async function rasterCardForStrip(
  drawn: DrawnCard,
  stripCardHeight: number,
): Promise<RasterCard> {
  const { data, info } = await sharp(cardAssetPath(drawn.card.id))
    .rotate(drawn.reversed ? 180 : 0)
    .resize({ height: stripCardHeight, fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width ?? 0, height: info.height ?? 0 };
}
