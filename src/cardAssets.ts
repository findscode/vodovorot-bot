import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECK } from './deck.js';

/** Корень проекта (работает из `src/` при tsx и из `dist/` при node). */
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CARDS_ASSETS_DIR = join(pkgRoot, 'assets', 'cards');

function cardFileName(cardId: number): string {
  return `${String(cardId).padStart(2, '0')}.jpg`;
}

export function isValidCardId(cardId: number): boolean {
  return Number.isInteger(cardId) && cardId >= 0 && cardId < DECK.length;
}

export function cardJPEGPath(cardId: number): string {
  if (!isValidCardId(cardId)) {
    throw new RangeError(`Invalid card id: ${cardId}`);
  }
  return join(CARDS_ASSETS_DIR, cardFileName(cardId));
}

export function cardImageExists(cardId: number): boolean {
  if (!isValidCardId(cardId)) return false;
  return existsSync(join(CARDS_ASSETS_DIR, cardFileName(cardId)));
}
