import sharp from 'sharp';
import { Input } from 'telegraf';
import { rasterCardForStrip } from './cardImageRaster.js';
import type { DrawnCard } from './deck.js';

export const STRIP_GAP_PX = 14;
/** Высота карты на полосе (нормализованные PNG дают одинаковую ширину слота). */
export const STRIP_CARD_HEIGHT = 320;

type PhotoInput = ReturnType<typeof Input.fromBuffer>;

async function renderStripOnBlack(
  canvasW: number,
  canvasH: number,
  overlays: sharp.OverlayOptions[],
): Promise<Buffer> {
  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: '#000000',
    },
  })
    .composite(overlays)
    .jpeg({ quality: 88 })
    .toBuffer();
}

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
 * «Карта дня»: та же геометрия полосы, что у трёх карт — горизонтальный кадр, чёрный фон,
 * одна вертикальная карта в среднем слоте.
 */
export async function dayCardStripPhotoInput(drawn: DrawnCard): Promise<PhotoInput> {
  const card = await rasterCardForStrip(drawn, STRIP_CARD_HEIGHT);
  const { width: canvasW, height: canvasH } = tripleStripCanvasDimensions(card.width, card.height);
  const left = middleStripSlotLeft(card.width);
  const top = Math.round((canvasH - card.height) / 2);
  const out = await renderStripOnBlack(canvasW, canvasH, [{ input: card.buffer, left, top }]);
  return Input.fromBuffer(out, 'spread-day-card.jpg');
}

export type TripletStripFrame = { jpeg: Buffer; width: number; height: number };

/** JPEG полосы из трёх карт — общая сборка для spread и 1-го триплета deep. */
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
  const jpeg = await renderStripOnBlack(canvasW, canvasH, composites);
  return { jpeg, width: canvasW, height: canvasH };
}

/** @deprecated Используй {@link tripletStripFrame}. */
export async function tripletStripJpegBuffer(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { jpeg, width, height } = await tripletStripFrame(drawn);
  return { buffer: jpeg, width, height };
}

export async function spreadCompositePhotoInput(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<PhotoInput> {
  const { jpeg } = await tripletStripFrame(drawn);
  return Input.fromBuffer(jpeg, 'spread-past-present-future.jpg');
}
