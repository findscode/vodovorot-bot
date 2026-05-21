import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECK } from './deck.js';

/** Корень проекта (работает из `src/` при tsx и из `dist/` при node). */
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CARDS_ASSETS_DIR = join(pkgRoot, 'assets', 'cards');

/** Размер нормализованного PNG в репозитории (все карты одинаковые). */
export const CARD_ASSET_WIDTH = 512;
export const CARD_ASSET_HEIGHT = 896;
export const CARD_CORNER_RADIUS_PX = 16;

export function cardFileName(cardId: number): string {
  return `${String(cardId).padStart(2, '0')}.png`;
}

export function isValidCardId(cardId: number): boolean {
  return Number.isInteger(cardId) && cardId >= 0 && cardId < DECK.length;
}

export function cardAssetPath(cardId: number): string {
  if (!isValidCardId(cardId)) {
    throw new RangeError(`Invalid card id: ${cardId}`);
  }
  return join(CARDS_ASSETS_DIR, cardFileName(cardId));
}

/** @deprecated Используйте {@link cardAssetPath}. */
export function cardJPEGPath(cardId: number): string {
  return cardAssetPath(cardId);
}

export function cardImageExists(cardId: number): boolean {
  if (!isValidCardId(cardId)) return false;
  return existsSync(cardAssetPath(cardId));
}
