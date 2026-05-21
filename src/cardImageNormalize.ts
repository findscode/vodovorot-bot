import sharp from 'sharp';

/** Целевой холст нормализованной карты (все файлы одного размера). */
export const CARD_ASSET_WIDTH = 512;
export const CARD_ASSET_HEIGHT = 896;
export const CARD_CORNER_RADIUS_PX = 16;

function roundedCornerMaskSvg(width: number, height: number, radius: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
  );
}

/**
 * Вписывает исходник в прозрачный холст фиксированного размера и скругляет углы (16px).
 */
export async function normalizeCardImageBuffer(source: Buffer): Promise<Buffer> {
  const fitted = await sharp(source)
    .resize(CARD_ASSET_WIDTH, CARD_ASSET_HEIGHT, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const mask = roundedCornerMaskSvg(CARD_ASSET_WIDTH, CARD_ASSET_HEIGHT, CARD_CORNER_RADIUS_PX);
  return sharp(fitted)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}
