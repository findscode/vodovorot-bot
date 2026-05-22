/** IANA-идентификатор поддерживается рантаймом (`Intl`). */
export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Текущие часы и минуты на стене часов в указанном IANA-часовом поясе. */
export function localWallHm(now: Date, timeZone: string): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 'NaN');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 'NaN');
  if (hour === 24) hour = 0;
  return { h: hour, m: minute };
}

export function parseConfiguredHm(hhmm: string): { h: number; m: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

/** Уже наступило или равно заданному локальному времени в `timeZone` (тот же календарный день). */
export function isAtOrPastLocalHm(now: Date, timeZone: string, configuredHhmm: string): boolean {
  const target = parseConfiguredHm(configuredHhmm);
  if (!target) return false;
  let cur: { h: number; m: number };
  try {
    cur = localWallHm(now, timeZone);
  } catch {
    return false;
  }
  return cur.h > target.h || (cur.h === target.h && cur.m >= target.m);
}
