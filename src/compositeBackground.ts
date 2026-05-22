import sharp from 'sharp';

/** Фон всех фото с картами в Telegram (источник правды). */
export const COMPOSITE_BLACK = { r: 0, g: 0, b: 0 } as const;

/**
 * Собирает RGBA-слои на непрозрачном чёрном холсте.
 * Прозрачные углы карт и зазоры между слоями → чёрный, не белый/прозрачный в клиенте.
 */
export async function compositeLayersOnBlack(
  width: number,
  height: number,
  overlays: sharp.OverlayOptions[],
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: COMPOSITE_BLACK,
    },
  })
    .composite(overlays)
    .removeAlpha()
    .png()
    .toBuffer();
}

/** Одна карта (PNG с альфой) на чёрном холсте того же размера. */
export async function flattenCardPngOnBlack(
  inputPath: string,
  rotateDegrees?: number,
): Promise<Buffer> {
  let pipeline = sharp(inputPath);
  if (rotateDegrees) pipeline = pipeline.rotate(rotateDegrees);
  const card = await pipeline.png().toBuffer();
  const meta = await sharp(card).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  return compositeLayersOnBlack(w, h, [{ input: card, left: 0, top: 0 }]);
}
