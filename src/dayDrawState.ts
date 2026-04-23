import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DEFAULT_DAY_DRAW_TIMEZONE = 'Europe/Moscow';

/** Часовой пояс границы «суток» для лимита «карта дня» (IANA, например Europe/Moscow). */
export function getDayDrawTimezone(): string {
  const fromEnv = process.env.DAY_DRAW_TIMEZONE?.trim();
  return fromEnv || DEFAULT_DAY_DRAW_TIMEZONE;
}

/**
 * Календарная дата в часовом поясе лимита (по умолчанию Москва) — `YYYY-MM-DD`.
 * Граница суток задаётся через `DAY_DRAW_TIMEZONE` или `Europe/Moscow`.
 */
export function moscowCalendarDate(now = new Date()): string {
  return calendarDateInTimezone(now, getDayDrawTimezone());
}

export function calendarDateInTimezone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
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

/** Уже использован слот на эту календарную дату (ключ как у `moscowCalendarDate`). */
export function hasDayDrawSlotUsed(userId: number, calendarDayKey: string): Promise<boolean> {
  return runExclusive(async () => {
    const path = getDayDrawStatePath();
    const state = await readState(path);
    return state[String(userId)] === calendarDayKey;
  });
}

/**
 * Резервирует «слот» карты дня на указанную календарную дату для userId.
 * @returns `true`, если слот выдан впервые за эту дату; `false`, если дата уже была записана.
 */
export function tryConsumeDayDrawSlot(userId: number, calendarDayKey: string): Promise<boolean> {
  return runExclusive(async () => {
    const path = getDayDrawStatePath();
    const state = await readState(path);
    const key = String(userId);
    if (state[key] === calendarDayKey) {
      return false;
    }
    state[key] = calendarDayKey;
    await writeState(path, state);
    return true;
  });
}
