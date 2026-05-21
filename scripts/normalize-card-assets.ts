/**
 * Нормализация assets/cards: PNG с прозрачным фоном, единый холст, скругление 16px.
 * Источник: NN.jpg или уже существующий NN.png. Результат: NN.png.
 *
 * Запуск: npm run normalize-cards
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CARDS_ASSETS_DIR } from '../src/cardAssets.js';
import { normalizeCardImageBuffer } from '../src/cardImageNormalize.js';
import { DECK } from '../src/deck.js';

async function sourcePathForId(id: number): Promise<string | null> {
  const base = String(id).padStart(2, '0');
  const png = join(CARDS_ASSETS_DIR, `${base}.png`);
  const jpg = join(CARDS_ASSETS_DIR, `${base}.jpg`);
  try {
    await readFile(png);
    return png;
  } catch {
    /* try jpg */
  }
  try {
    await readFile(jpg);
    return jpg;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const entries = await readdir(CARDS_ASSETS_DIR).catch(() => [] as string[]);
  if (entries.length === 0) {
    console.error(`Каталог пуст или отсутствует: ${CARDS_ASSETS_DIR}`);
    console.error('Положите 00.jpg … 77.jpg (или png) и запустите снова.');
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  for (const card of DECK) {
    const src = await sourcePathForId(card.id);
    if (src === null) {
      console.warn(`Пропуск ${card.id}: нет файла`);
      skip++;
      continue;
    }
    const raw = await readFile(src);
    const out = await normalizeCardImageBuffer(raw);
    const dest = join(CARDS_ASSETS_DIR, `${String(card.id).padStart(2, '0')}.png`);
    await writeFile(dest, out);
    ok++;
    console.log(`OK ${dest}`);
  }
  console.log(`Готово: ${ok} PNG, пропущено ${skip}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
