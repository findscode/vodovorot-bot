import sharp from 'sharp';
import type { DrawnCard } from '../deck.js';
import { tripletStripJpegBuffer } from '../spreadComposite.js';
import { DEEP_COMPOSITE_MAX_SIDE_PX, DEEP_STACK_PEEK_RATIO } from './constants.js';

export type CompositeFrame = { jpeg: Buffer; width: number; height: number };

export async function buildTripletStripFrame(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<CompositeFrame> {
  const { buffer, width, height } = await tripletStripJpegBuffer(drawn);
  return { jpeg: buffer, width, height };
}

/** Накопительный коллаж: ~15% предыдущего сверху + полный новый триплет снизу. */
export async function stackTripletOnPrevious(
  previous: CompositeFrame,
  newStrip: CompositeFrame,
): Promise<CompositeFrame> {
  const targetW = newStrip.width;
  const prevMeta = await sharp(previous.jpeg).metadata();
  const prevH = prevMeta.height ?? previous.height;
  const peekH = Math.max(1, Math.round(prevH * DEEP_STACK_PEEK_RATIO));
  const prevTop = await sharp(previous.jpeg)
    .resize({ width: targetW, height: peekH, fit: 'cover', position: 'top' })
    .toBuffer();
  const newScaled = await sharp(newStrip.jpeg).resize({ width: targetW, fit: 'inside' }).toBuffer();
  const newMeta = await sharp(newScaled).metadata();
  const newH = newMeta.height ?? newStrip.height;
  const canvasH = peekH + newH;
  const jpeg = await sharp({
    create: {
      width: targetW,
      height: canvasH,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([
      { input: prevTop, left: 0, top: 0 },
      { input: newScaled, left: 0, top: peekH },
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
