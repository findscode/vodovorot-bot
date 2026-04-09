import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень проекта (работает из `src/` при tsx и из `dist/` при node). */
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CARDS_ASSETS_DIR = join(pkgRoot, 'assets', 'cards');

export function cardJPEGPath(cardId: number): string {
  return join(CARDS_ASSETS_DIR, `${String(cardId).padStart(2, '0')}.jpg`);
}

export function cardImageExists(cardId: number): boolean {
  return existsSync(cardJPEGPath(cardId));
}
