import sharp from 'sharp';
import type { DrawnCard } from '../deck.js';
import { STRIP_CARD_HEIGHT, tripletStripJpegBuffer } from '../spreadComposite.js';
import { DEEP_COMPOSITE_MAX_SIDE_PX, DEEP_STRIP_STACK_OFFSET_FRACTION } from './constants.js';

export type CompositeFrame = { jpeg: Buffer; width: number; height: number };

export async function buildTripletStripFrame(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<CompositeFrame> {
  const { buffer, width, height } = await tripletStripJpegBuffer(drawn);
  return { jpeg: buffer, width, height };
}

async function scaleFrameToWidth(frame: CompositeFrame, targetW: number): Promise<Buffer> {
  return sharp(frame.jpeg)
    .resize({ width: targetW, fit: 'inside' })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Накопительный коллаж: новый триплет поверх предыдущего со смещением вниз
 * (как стопка на узком столе — верх предыдущих карт чуть виден).
 */
export async function stackTripletOnPrevious(
  previous: CompositeFrame,
  newStrip: CompositeFrame,
): Promise<CompositeFrame> {
  const targetW = Math.max(previous.width, newStrip.width, 1);
  const [prevBuf, newBuf] = await Promise.all([
    scaleFrameToWidth(previous, targetW),
    scaleFrameToWidth(newStrip, targetW),
  ]);
  const prevMeta = await sharp(prevBuf).metadata();
  const newMeta = await sharp(newBuf).metadata();
  const prevH = prevMeta.height ?? previous.height;
  const newH = newMeta.height ?? newStrip.height;
  const offsetY = Math.round(STRIP_CARD_HEIGHT * DEEP_STRIP_STACK_OFFSET_FRACTION);
  const canvasH = Math.max(prevH, offsetY + newH);
  const jpeg = await sharp({
    create: {
      width: targetW,
      height: canvasH,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([
      { input: prevBuf, left: 0, top: 0 },
      { input: newBuf, left: 0, top: offsetY },
    ])
    .jpeg({ quality: 86 })
    .toBuffer();
  return { jpeg, width: targetW, height: canvasH };
}

export async function fitCompositeForTelegram(frame: CompositeFrame): Promise<Buffer> {
  const maxSide = Math.max(frame.width, frame.height);
  if (maxSide <= DEEP_COMPOSITE_MAX_SIDE_PX) return frame.jpeg;
  const scale = DEEP_COMPOSITE_MAX_SIDE_PX / maxSide;
  const w = Math.max(1, Math.round(frame.width * scale));
  const h = Math.max(1, Math.round(frame.height * scale));
  return sharp(frame.jpeg)
    .resize({ width: w, height: h, fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();
}
