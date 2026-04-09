import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Календарная дата UTC в формате YYYY-MM-DD (граница «суток» для лимита). */
export function utcCalendarDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function getDayDrawStatePath(): string {
  const fromEnv = process.env.DAY_DRAW_STATE_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), 'data', 'day-draw-state.json');
}

type StateMap = Record<string, string>;

async function readState(filePath: string): Promise<StateMap> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StateMap;
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.error('[day-draw-state] не удалось прочитать файл:', e);
    }
  }
  return {};
}

async function writeState(filePath: string, state: StateMap): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state)}\n`, 'utf8');
}

let writeChain: Promise<void> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Резервирует «слот» карты дня на сегодня (UTC) для userId.
 * @returns `true`, если слот выдан (первое гадание за эти сутки); `false`, если сегодня уже брали.
 */
export function tryConsumeDayDrawSlot(userId: number, todayUtc: string): Promise<boolean> {
  return runExclusive(async () => {
    const path = getDayDrawStatePath();
    const state = await readState(path);
    const key = String(userId);
    if (state[key] === todayUtc) {
      return false;
    }
    state[key] = todayUtc;
    await writeState(path, state);
    return true;
  });
}
