import sharp from 'sharp';
import type { DrawnCard } from '../deck.js';
import { STRIP_CARD_HEIGHT, tripletStripFrame } from '../spreadComposite.js';
import { DEEP_COMPOSITE_MAX_SIDE_PX, DEEP_STRIP_STACK_OFFSET_FRACTION } from './constants.js';

export type CompositeFrame = { jpeg: Buffer; width: number; height: number };

export async function buildTripletStripFrame(
  drawn: [DrawnCard, DrawnCard, DrawnCard],
): Promise<CompositeFrame> {
  return tripletStripFrame(drawn);
}

async function scaleFrameToWidth(frame: CompositeFrame, targetW: number): Promise<Buffer> {
  return sharp(frame.jpeg)
    .resize({ width: targetW, fit: 'inside' })
    .jpeg({ quality: 88 })
    .toBuffer();
}

function stackOffsetPx(tripletIndex: number): number {
  return Math.round(tripletIndex * STRIP_CARD_HEIGHT * DEEP_STRIP_STACK_OFFSET_FRACTION);
}

/** Лёгкая тень у верхнего края полосы при наслоении (2-й триплет и далее). */
async function stripWithStackShadow(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const shadowH = Math.max(8, Math.round(height * 0.07));
  const gradientSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${shadowH}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;
  const shadow = await sharp(Buffer.from(gradientSvg)).png().toBuffer();
  return sharp(buf)
    .composite([{ input: shadow, left: 0, top: 0, blend: 'over' }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Накопительный коллаж: триплет k накладывается поверх предыдущего стола,
 * смещение от верха = k × 12.5% высоты карты на полосе.
 */
export async function stackTripletOnPrevious(
  previous: CompositeFrame,
  newStrip: CompositeFrame,
  tripletIndex: number,
): Promise<CompositeFrame> {
  const targetW = Math.max(previous.width, newStrip.width, 1);
  const [prevBuf, newBufRaw] = await Promise.all([
    scaleFrameToWidth(previous, targetW),
    scaleFrameToWidth(newStrip, targetW),
  ]);
  const prevMeta = await sharp(prevBuf).metadata();
  const newMeta = await sharp(newBufRaw).metadata();
  const prevH = prevMeta.height ?? previous.height;
  const newH = newMeta.height ?? newStrip.height;
  const newW = newMeta.width ?? targetW;
  const offsetY = stackOffsetPx(tripletIndex);
  const newBuf = tripletIndex > 0 ? await stripWithStackShadow(newBufRaw, newW, newH) : newBufRaw;
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
