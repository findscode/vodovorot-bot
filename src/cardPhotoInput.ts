import sharp from 'sharp';
import { Input } from 'telegraf';
import { cardAssetPath, cardFileName } from './cardAssets.js';

type PhotoInput = ReturnType<typeof Input.fromLocalFile>;

/**
 * Входное фото для Telegram: прямая карта — PNG с диска;
 * перевёрнутая — PNG, повёрнутый на 180°.
 */
export async function cardPhotoInput(cardId: number, reversed: boolean): Promise<PhotoInput> {
  const path = cardAssetPath(cardId);
  const name = cardFileName(cardId);
  if (!reversed) {
    return Input.fromLocalFile(path);
  }
  const buf = await sharp(path).rotate(180).png().toBuffer();
  return Input.fromBuffer(buf, name);
}
