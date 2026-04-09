import sharp from 'sharp';
import { Input } from 'telegraf';
import { cardJPEGPath } from './cardAssets.js';

type PhotoInput = ReturnType<typeof Input.fromLocalFile>;

/**
 * Входное фото для Telegram: прямая карта — файл с диска;
 * перевёрнутая — JPEG, повёрнутый на 180° (как при физическом раскладе).
 */
export async function cardPhotoInput(cardId: number, reversed: boolean): Promise<PhotoInput> {
  const path = cardJPEGPath(cardId);
  if (!reversed) {
    return Input.fromLocalFile(path);
  }
  const buf = await sharp(path).rotate(180).jpeg({ quality: 90 }).toBuffer();
  return Input.fromBuffer(buf, `${String(cardId).padStart(2, '0')}.jpg`);
}
