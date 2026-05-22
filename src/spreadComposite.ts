import sharp from 'sharp';
import { Input } from 'telegraf';
import { compositeLayersOnBlack } from './compositeBackground.js';
import { rasterCardForStrip } from './cardImageRaster.js';
import type { DrawnCard } from './deck.js';

export const STRIP_GAP_PX = 14;
/** Высота карты на полосе (нормализованные PNG дают одинаковую ширину слота). */
export const STRIP_CARD_HEIGHT = 320;

type PhotoInput = ReturnType<typeof Input.fromBuffer>;

/** Полоса или кадр коллажа: PNG на чёрном фоне (карты с альфой поверх). */
export type TripletStripFrame = { png: Buffer; width: number; height: number };

/** Размер полосы как у расклада «три карты», если все слоты одной ширины `slotWidth`. */
export function tripleStripCanvasDimensions(
  slotWidth: number,
  slotHeight: number,
): {
  width: number;
  height: number;
} {
  const h = Math.max(slotHeight, 1);
  return { width: slotWidth * 3 + STRIP_GAP_PX * 2, height: h };
}

/** Левый край среднего слота (карта по центру полосы). */
export function middleStripSlotLeft(slotWidth: number): number {
  return slotWidth + STRIP_GAP_PX;
}

/**
 * «Карта дня»: та же геометрия полосы, что у трёх карт — чёрный фон,
 * одна вертикальная карта в среднем слоте.
 */
export async function dayCardStripPhotoInput(drawn: DrawnCard): Promise<PhotoInput> {
  const card = await rasterCardForStrip(drawn, STRIP_CARD_HEIGHT);
  const { width: canvasW, height: canvasH } = tripleStripCanvasDimensions(card.width, card.height);
  const left = middleStripSlotLeft(card.width);
  const top = Math.round((canvasH - card.height) / 2);
  const out = await compositeLayersOnBlack(canvasW, canvasH, [{ input: card.buffer, left, top }]);
  return Input.fromBuffer(out, 'spread-day-card.png');
}

/** PNG полосы из трёх карт — общая сборка для spread и 1-го триплета deep. */
export async function tripletStripFrame(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<TripletStripFrame> {
  const resized = await Promise.all(drawn.map((d) => rasterCardForStrip(d, STRIP_CARD_HEIGHT)));
  const slotW = Math.max(...resized.map((c) => c.width), 1);
  const canvasH = Math.max(...resized.map((c) => c.height), 1);
  const composites: sharp.OverlayOptions[] = [];
  let x = 0;
  for (const card of resized) {
    const left = x + Math.round((slotW - card.width) / 2);
    const top = Math.round((canvasH - card.height) / 2);
    composites.push({ input: card.buffer, left, top });
    x += slotW + STRIP_GAP_PX;
  }
  const canvasW = slotW * 3 + STRIP_GAP_PX * 2;
  const png = await compositeLayersOnBlack(canvasW, canvasH, composites);
  return { png, width: canvasW, height: canvasH };
}

/** @deprecated Используй {@link tripletStripFrame}. */
export async function tripletStripJpegBuffer(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { png, width, height } = await tripletStripFrame(drawn);
  return { buffer: png, width, height };
}

export async function spreadCompositePhotoInput(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<PhotoInput> {
  const { png } = await tripletStripFrame(drawn);
  return Input.fromBuffer(png, 'spread-past-present-future.png');
}
