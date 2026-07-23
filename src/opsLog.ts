import { dayDrawCalendarDate } from './dayDrawState.js';

export type OpsEventName =
  | 'question_clarity_checked'
  | 'question_clarity_skip'
  | 'question_clarity_prompted'
  | 'spread_limit_hit'
  | 'spread_completed'
  | 'deep_triplet_limit_hit'
  | 'deep_session_start'
  | 'deep_final_basic'
  | 'deep_final_full'
  | 'day_draw_delivered'
  | 'ai_truncated'
  | 'reading_format_thin'
  | 'ai_error';

type DayBucket = {
  counts: Partial<Record<OpsEventName, number>>;
  aiErrorsByContext: Record<string, number>;
  aiLatencyMs: number[];
  aiLatencyByContext: Record<string, number[]>;
  aiSuccessByModel: Record<string, number>;
  claritySkipByReason: Record<string, number>;
};

const MAX_LATENCY_SAMPLES = 500;

let bucketDayKey = dayDrawCalendarDate();
let bucket: DayBucket = freshBucket();

function freshBucket(): DayBucket {
  return {
    counts: {},
    aiErrorsByContext: {},
    aiLatencyMs: [],
    aiLatencyByContext: {},
    aiSuccessByModel: {},
    claritySkipByReason: {},
  };
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
  if (event === 'question_clarity_skip' && typeof meta?.reason === 'string') {
    bucket.claritySkipByReason[meta.reason] = (bucket.claritySkipByReason[meta.reason] ?? 0) + 1;
  }
  const extra = formatMeta(meta);
  console.log(`[ops] event=${event} day=${bucketDayKey}${extra ? ` ${extra}` : ''}`);
}

export function opsAiRequest(context: string, ms: number): void {
  ensureDay();
  if (bucket.aiLatencyMs.length < MAX_LATENCY_SAMPLES) {
    bucket.aiLatencyMs.push(ms);
  }
  const contextSamples = (bucket.aiLatencyByContext[context] ??= []);
  if (contextSamples.length < MAX_LATENCY_SAMPLES) {
    contextSamples.push(ms);
  }
  console.log(`[ops] event=ai_request_ms day=${bucketDayKey} context=${context} ms=${ms}`);
}

export function opsAiModelSuccess(model: string): void {
  ensureDay();
  bucket.aiSuccessByModel[model] = (bucket.aiSuccessByModel[model] ?? 0) + 1;
  console.log(`[ops] event=ai_model_success day=${bucketDayKey} model=${model}`);
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
  aiLatencyByContext: Record<string, { p95Ms: number | null; sampleCount: number }>;
  aiSuccessByModel: Record<string, number>;
  claritySkipByReason: Record<string, number>;
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
  const aiLatencyByContext: OpsStatsSnapshot['aiLatencyByContext'] = {};
  for (const [context, samples] of Object.entries(bucket.aiLatencyByContext)) {
    const contextSorted = [...samples].sort((a, b) => a - b);
    aiLatencyByContext[context] = {
      p95Ms: percentile(contextSorted, 95),
      sampleCount: contextSorted.length,
    };
  }
  return {
    dayKey: bucketDayKey,
    counts,
    aiErrorsByContext: { ...bucket.aiErrorsByContext },
    aiLatencyP95Ms: percentile(sorted, 95),
    aiLatencySampleCount: sorted.length,
    aiLatencyByContext,
    aiSuccessByModel: { ...bucket.aiSuccessByModel },
    claritySkipByReason: { ...bucket.claritySkipByReason },
  };
}

/** Сброс in-memory счётчиков (тесты). */
export function resetOpsStatsForTests(): void {
  bucketDayKey = dayDrawCalendarDate();
  bucket = freshBucket();
}
