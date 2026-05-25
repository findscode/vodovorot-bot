import { dayDrawCalendarDate } from './dayDrawState.js';

export type OpsEventName =
  | 'question_clarity_skip'
  | 'question_clarity_prompted'
  | 'spread_limit_hit'
  | 'spread_completed'
  | 'deep_triplet_limit_hit'
  | 'deep_session_start'
  | 'deep_final_basic'
  | 'deep_final_full'
  | 'day_draw_delivered'
  | 'ai_error';

type DayBucket = {
  counts: Partial<Record<OpsEventName, number>>;
  aiErrorsByContext: Record<string, number>;
  aiLatencyMs: number[];
};

const MAX_LATENCY_SAMPLES = 500;

let bucketDayKey = dayDrawCalendarDate();
let bucket: DayBucket = freshBucket();

function freshBucket(): DayBucket {
  return { counts: {}, aiErrorsByContext: {}, aiLatencyMs: [] };
}

function ensureDay(): void {
  const key = dayDrawCalendarDate();
  if (key !== bucketDayKey) {
    bucketDayKey = key;
    bucket = freshBucket();
  }
}

function inc(event: OpsEventName): void {
  ensureDay();
  bucket.counts[event] = (bucket.counts[event] ?? 0) + 1;
}

function formatMeta(meta?: Record<string, string | number>): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${String(v).replace(/\s/g, '_')}`)
    .join(' ');
}

/** Структурированное ops-событие (#61): stdout + in-memory счётчик за календарные сутки. */
export function opsEvent(event: OpsEventName, meta?: Record<string, string | number>): void {
  inc(event);
  const extra = formatMeta(meta);
  console.log(`[ops] event=${event} day=${bucketDayKey}${extra ? ` ${extra}` : ''}`);
}

export function opsAiRequest(context: string, ms: number): void {
  ensureDay();
  if (bucket.aiLatencyMs.length < MAX_LATENCY_SAMPLES) {
    bucket.aiLatencyMs.push(ms);
  }
  console.log(`[ops] event=ai_request_ms day=${bucketDayKey} context=${context} ms=${ms}`);
}

export function opsAiError(context: string, detail?: string): void {
  ensureDay();
  bucket.counts.ai_error = (bucket.counts.ai_error ?? 0) + 1;
  bucket.aiErrorsByContext[context] = (bucket.aiErrorsByContext[context] ?? 0) + 1;
  const safe = detail?.replace(/\s/g, '_').slice(0, 80);
  console.log(
    `[ops] event=ai_error day=${bucketDayKey} context=${context}${safe ? ` detail=${safe}` : ''}`,
  );
}

export type OpsStatsSnapshot = {
  dayKey: string;
  counts: Record<string, number>;
  aiErrorsByContext: Record<string, number>;
  aiLatencyP95Ms: number | null;
  aiLatencySampleCount: number;
};

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

export function getOpsStatsSnapshot(): OpsStatsSnapshot {
  ensureDay();
  const sorted = [...bucket.aiLatencyMs].sort((a, b) => a - b);
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(bucket.counts)) {
    if (v !== undefined) counts[k] = v;
  }
  return {
    dayKey: bucketDayKey,
    counts,
    aiErrorsByContext: { ...bucket.aiErrorsByContext },
    aiLatencyP95Ms: percentile(sorted, 95),
    aiLatencySampleCount: sorted.length,
  };
}

/** Сброс in-memory счётчиков (тесты). */
export function resetOpsStatsForTests(): void {
  bucketDayKey = dayDrawCalendarDate();
  bucket = freshBucket();
}
