/** Допустимые локальные часы:минуты для ежедневной рассылки «карта дня». */
export const DAY_PUSH_HHMM_PRESETS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '18:00',
  '21:00',
] as const;

const PRESET_SET = new Set<string>(DAY_PUSH_HHMM_PRESETS);

export function isAllowedDayPushHhmm(hhmm: string): boolean {
  return PRESET_SET.has(hhmm.trim());
}

/** Если в env задано не из пресетов — ближайшее допустимое (иначе 09:00). */
export function snapDayPushHhmmToPreset(hhmm: string): string {
  const t = hhmm.trim();
  if (PRESET_SET.has(t)) return t;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return '09:00';
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (!Number.isFinite(minutes)) return '09:00';
  let best: string = DAY_PUSH_HHMM_PRESETS[0];
  let bestDist = Infinity;
  for (const p of DAY_PUSH_HHMM_PRESETS) {
    const [h, min] = p.split(':').map(Number) as [number, number];
    const pm = h * 60 + min;
    const d = Math.abs(pm - minutes);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
