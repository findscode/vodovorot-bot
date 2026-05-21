import sharp from 'sharp';
import { Input } from 'telegraf';
import { cardJPEGPath } from './cardAssets.js';
import type { DrawnCard } from './deck.js';

export const STRIP_GAP_PX = 14;
/** Высота карты на полосе (пропорции сохраняются, `fit: inside`). */
export const STRIP_CARD_HEIGHT = 920;

type PhotoInput = ReturnType<typeof Input.fromBuffer>;

type ResizedCard = { buffer: Buffer; width: number; height: number };

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

async function resizeCardForStrip(drawn: DrawnCard): Promise<ResizedCard> {
  const { data, info } = await sharp(cardJPEGPath(drawn.card.id))
    .rotate(drawn.reversed ? 180 : 0)
    .resize({ height: STRIP_CARD_HEIGHT, fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width ?? 0, height: info.height ?? 0 };
}

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

/**
 * «Карта дня»: та же геометрия полосы, что у трёх карт — горизонтальный кадр, чёрный фон,
 * одна вертикальная карта в среднем слоте (ширина и высота файла как у центральной ячейки расклада).
 */
export async function dayCardStripPhotoInput(drawn: DrawnCard): Promise<PhotoInput> {
  const card = await resizeCardForStrip(drawn);
  const { width: canvasW, height: canvasH } = tripleStripCanvasDimensions(card.width, card.height);
  const left = middleStripSlotLeft(card.width);
  const top = Math.round((canvasH - card.height) / 2);
  const out = await renderStripOnBlack(canvasW, canvasH, [{ input: card.buffer, left, top }]);
  return Input.fromBuffer(out, 'spread-day-card.jpg');
}

/**
 * Расклад «прошлое — настоящее — будущее»: три карты слева направо на чёрной полосе.
 */
/** JPEG полосы из трёх карт (для расклада и глубинной диагностики). */
export async function tripletStripJpegBuffer(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const resized = await Promise.all(drawn.map((d) => resizeCardForStrip(d)));
  const canvasH = Math.max(...resized.map((c) => c.height), 1);
  const composites: sharp.OverlayOptions[] = [];
  let x = 0;
  for (const card of resized) {
    const top = Math.round((canvasH - card.height) / 2);
    composites.push({ input: card.buffer, left: x, top });
    x += card.width + STRIP_GAP_PX;
  }
  const canvasW = x - STRIP_GAP_PX;
  const buffer = await renderStripOnBlack(canvasW, canvasH, composites);
  return { buffer, width: canvasW, height: canvasH };
}

export async function spreadCompositePhotoInput(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<PhotoInput> {
  const { buffer } = await tripletStripJpegBuffer(drawn);
  return Input.fromBuffer(buffer, 'spread-past-present-future.jpg');
}
