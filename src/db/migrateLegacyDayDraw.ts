import { existsSync, readFileSync } from 'node:fs';
import { getDayDrawStatePath } from '../dayDrawState.js';
import { getDb } from './database.js';

/**
 * Однократный импорт `day-draw-state.json` в `day_draw_slots`, если таблица пуста.
 * Путь к JSON — как у прежнего `DAY_DRAW_STATE_PATH` / дефолт.
 */
export function migrateLegacyDayDrawJsonIfNeeded(): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) AS c FROM day_draw_slots').get() as { c: number }).c;
  if (count > 0) return;

  const path = getDayDrawStatePath();
  if (!existsSync(path)) return;

  try {
    const raw = readFileSync(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    const ins = db.prepare('INSERT OR IGNORE INTO day_draw_slots (user_id, calendar_date) VALUES (?, ?)');
    db.transaction(() => {
      for (const [uidStr, cal] of Object.entries(parsed as Record<string, unknown>)) {
        const id = Number(uidStr);
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        if (typeof cal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cal)) continue;
        ins.run(id, cal);
      }
    })();
    console.log('[migrate] Слоты «карта дня» импортированы из JSON в SQLite:', path);
  } catch (e) {
    console.warn('[migrate] Не удалось импортировать legacy JSON слотов:', e);
  }
}
