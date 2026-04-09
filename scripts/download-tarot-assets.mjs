/**
 * Скачивает 78 карт Райдера–Уэйта (Wikimedia Commons, PD в США/Великобритании)
 * в assets/cards/00.jpg … 77.jpg (индекс = TarotCard.id).
 *
 * Запуск: npm run download-cards
 * Повторно: пропускает уже скачанные файлы (>50 КБ). Полная перезаливка: npm run download-cards -- --force
 *
 * См. https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'cards');

const USER_AGENT = 'Vodovorot/1.0 (local asset sync; Node.js)';

/** Имена файлов на Commons, в порядке id 0–21 */
const MAJOR_COMMONS = [
  'RWS Tarot 00 Fool.jpg',
  'RWS Tarot 01 Magician.jpg',
  'RWS Tarot 02 High Priestess.jpg',
  'RWS Tarot 03 Empress.jpg',
  'RWS Tarot 04 Emperor.jpg',
  'RWS Tarot 05 Hierophant.jpg',
  'RWS Tarot 06 Lovers.jpg',
  'RWS Tarot 07 Chariot.jpg',
  'RWS Tarot 08 Strength.jpg',
  'RWS Tarot 09 Hermit.jpg',
  'RWS Tarot 10 Wheel of Fortune.jpg',
  'RWS Tarot 11 Justice.jpg',
  'RWS Tarot 12 Hanged Man.jpg',
  'RWS Tarot 13 Death.jpg',
  'RWS Tarot 14 Temperance.jpg',
  'RWS Tarot 15 Devil.jpg',
  'RWS Tarot 16 Tower.jpg',
  'RWS Tarot 17 Star.jpg',
  'RWS Tarot 18 Moon.jpg',
  'RWS Tarot 19 Sun.jpg',
  'RWS Tarot 20 Judgement.jpg',
  'RWS Tarot 21 World.jpg',
];

const SUIT_PREFIXES = ['Wands', 'Cups', 'Swords', 'Pents'];

function minorCommonsName(suitPrefix, rank1to14) {
  if (suitPrefix === 'Wands' && rank1to14 === 9) {
    return 'Tarot Nine of Wands.jpg';
  }
  return `${suitPrefix}${String(rank1to14).padStart(2, '0')}.jpg`;
}

function buildMinorCommons() {
  const list = [];
  for (const suit of SUIT_PREFIXES) {
    for (let r = 1; r <= 14; r++) {
      list.push(minorCommonsName(suit, r));
    }
  }
  return list;
}

const COMMONS_BY_ID = [...MAJOR_COMMONS, ...buildMinorCommons()];

if (COMMONS_BY_ID.length !== 78) {
  console.error('Ожидалось 78 имён файлов, получилось', COMMONS_BY_ID.length);
  process.exit(1);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function resolveUrls(filenames) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const batches = chunk(filenames, 12);

  for (const batch of batches) {
    const titles = batch.map((f) => `File:${f}`).join('|');
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('titles', titles);
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url');
    url.searchParams.set('format', 'json');

    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      throw new Error(`Commons API ${res.status}`);
    }
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) {
      throw new Error('Нет pages в ответе API');
    }
    for (const page of Object.values(pages)) {
      if (page.missing != null || page.invalid != null) {
        continue;
      }
      const title = page.title?.replace(/^File:/, '') ?? '';
      const infoUrl = page.imageinfo?.[0]?.url;
      if (title && infoUrl) {
        map.set(title, infoUrl);
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return map;
}

async function fetchImageWithRetry(src, label, maxAttempts = 6) {
  let delayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const imgRes = await fetch(src, { headers: { 'User-Agent': USER_AGENT } });
    if (imgRes.ok) {
      return Buffer.from(await imgRes.arrayBuffer());
    }
    if (imgRes.status === 429 && attempt < maxAttempts) {
      const ra = imgRes.headers.get('retry-after');
      const wait = ra ? Math.max(1000, Number(ra) * 1000) : delayMs;
      console.warn(`429 ${label}, пауза ${wait} мс (попытка ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, wait));
      delayMs = Math.min(delayMs * 2, 60_000);
      continue;
    }
    throw new Error(`HTTP ${imgRes.status} для ${label}`);
  }
  throw new Error(`Не удалось скачать ${label}`);
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(outDir, { recursive: true });
  console.log('Запрос URL на Wikimedia Commons…');
  const urlMap = await resolveUrls(COMMONS_BY_ID);

  for (let id = 0; id < 78; id++) {
    const name = COMMONS_BY_ID[id];
    const outPath = join(outDir, `${String(id).padStart(2, '0')}.jpg`);
    if (!force) {
      try {
        const st = await stat(outPath);
        if (st.size > 50_000) {
          console.log(`SKIP ${outPath}`);
          continue;
        }
      } catch {
        /* файла нет */
      }
    }
    const src = urlMap.get(name);
    if (!src) {
      console.error(`Нет URL для id=${id} (${name})`);
      process.exit(1);
    }
    const buf = await fetchImageWithRetry(src, `id=${id} ${name}`);
    await writeFile(outPath, buf);
    console.log(`OK ${outPath} ← ${name}`);
    await new Promise((r) => setTimeout(r, 800));
  }
  console.log('Готово: 78 файлов в', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
