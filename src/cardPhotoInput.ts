import { Input } from 'telegraf';
import { cardAssetPath, cardFileName } from './cardAssets.js';
import { flattenCardPngOnBlack } from './compositeBackground.js';

type PhotoInput = ReturnType<typeof Input.fromBuffer>;

/**
 * Входное фото для Telegram: карта на чёрном фоне (прозрачные углы PNG → чёрные).
 * Перевёрнутая — поворот 180° перед сборкой.
 */
export async function cardPhotoInput(cardId: number, reversed: boolean): Promise<PhotoInput> {
  const path = cardAssetPath(cardId);
  const name = cardFileName(cardId);
  const buf = await flattenCardPngOnBlack(path, reversed ? 180 : undefined);
  return Input.fromBuffer(buf, name);
}
