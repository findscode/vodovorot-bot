import sharp from 'sharp';
import { Input } from 'telegraf';
import { cardJPEGPath } from './cardAssets.js';
import type { DrawnCard } from './deck.js';

const GAP_PX = 14;
/** Высота каждой карты после ресайза (пропорции сохраняются, `fit: inside`). */
const STRIP_CARD_HEIGHT = 920;

type PhotoInput = ReturnType<typeof Input.fromBuffer>;

/**
 * Одно изображение: три карты слева направо (Прошлое — Настоящее — Будущее).
 * Перевёрнутые — с поворотом 180°, как у одиночной карты.
 */
export async function spreadCompositePhotoInput(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<PhotoInput> {
  const widths: number[] = [];
  const heights: number[] = [];
  const buffers: Buffer[] = [];

  for (const d of drawn) {
    const { data, info } = await sharp(cardJPEGPath(d.card.id))
      .rotate(d.reversed ? 180 : 0)
      .resize({ height: STRIP_CARD_HEIGHT, fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    buffers.push(data);
    widths.push(info.width ?? 0);
    heights.push(info.height ?? 0);
  }

  const canvasH = Math.max(heights[0]!, heights[1]!, heights[2]!, 1);
  const totalW = widths[0]! + GAP_PX + widths[1]! + GAP_PX + widths[2]!;

  const composites: sharp.OverlayOptions[] = [];
  let x = 0;
  for (let i = 0; i < 3; i++) {
    const top = Math.round((canvasH - heights[i]!) / 2);
    composites.push({ input: buffers[i]!, left: x, top });
    x += widths[i]! + GAP_PX;
  }

  const out = await sharp({
    create: {
      width: totalW,
      height: canvasH,
      channels: 3,
      background: '#000000',
    },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();

  return Input.fromBuffer(out, 'spread-past-present-future.jpg');
}
