import {
  countActivePremiumSync,
  countDayPushSubscribersSync,
  countUsersSync,
} from './db/usersRepo.js';
import { getOpsStatsSnapshot } from './opsLog.js';

const AI_CONTEXT_LABELS: Record<string, string> = {
  day: '«На день»',
  spread: 'три карты',
  clarity: 'ясность вопроса',
  deep_triplet: 'deep-триплет',
  deep_final: 'deep-финал',
  deep_final_basic: 'deep-финал basic',
};

function formatDayKeyRu(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMap(
  values: Record<string, number>,
  label: (key: string) => string = (key) => key,
): string {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? entries.map(([key, n]) => `${label(key)} — ${n}`).join(', ') : 'нет';
}

function contextLabel(context: string): string {
  return AI_CONTEXT_LABELS[context] ?? context.replaceAll('_', ' ');
}

function modelLabel(model: string): string {
  return (
    model
      .split('/')
      .at(-1)
      ?.replace(/:free$/, '') ?? model
  );
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return `${(ms / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} с`;
}

function formatLatencyByContext(
  values: Record<string, { p95Ms: number | null; sampleCount: number }>,
): string {
  const entries = Object.entries(values).sort((a, b) => b[1].sampleCount - a[1].sampleCount);
  return entries.length > 0
    ? entries
        .map(([context, stats]) => `${contextLabel(context)} — ${formatLatency(stats.p95Ms)}`)
        .join(', ')
    : 'нет';
}

/** HTML для `/admin stats` (#62). */
export function adminStatsHtml(): string {
  const ops = getOpsStatsSnapshot();
  const c = ops.counts;
  const aiErrTotal = c.ai_error ?? 0;
  const deepCompleted = (c.deep_final_basic ?? 0) + (c.deep_final_full ?? 0);
  const claritySkipped = c.question_clarity_skip ?? 0;
  const latency = `${formatLatency(ops.aiLatencyP95Ms)} (${ops.aiLatencySampleCount} запросов)`;

  const lines = [
    '<b>Статистика</b>',
    '',
    `${formatDayKeyRu(ops.dayKey)} · за сутки · данные после последнего запуска`,
    '',
    '<b>👥 Пользователи</b>',
    `Всего: <b>${countUsersSync()}</b>`,
    `Premium: <b>${countActivePremiumSync()}</b>`,
    `Подписаны на «На день»: <b>${countDayPushSubscribersSync()}</b>`,
    '',
    '<b>🃏 Расклады за сутки</b>',
    `«На день»: <b>${c.day_draw_delivered ?? 0}</b>`,
    `«Прошлое — настоящее — будущее»: <b>${c.spread_completed ?? 0}</b>`,
    `Глубинная диагностика: начато <b>${c.deep_session_start ?? 0}</b>, завершено <b>${deepCompleted}</b>`,
    `Срабатывания лимитов: три карты — <b>${c.spread_limit_hit ?? 0}</b>, deep — <b>${c.deep_triplet_limit_hit ?? 0}</b>`,
    '',
    '<b>🔎 Ясность вопроса</b>',
    `Проверок: <b>${c.question_clarity_checked ?? 0}</b>`,
    `Уточнение показано: <b>${c.question_clarity_prompted ?? 0}</b>`,
    `Проверка пропущена из-за сбоя: <b>${claritySkipped}</b>`,
    `Причины: ${formatMap(ops.claritySkipByReason, (reason) =>
      reason === 'ai_error'
        ? 'ошибка ИИ'
        : reason === 'parse_error'
          ? 'неверный формат ответа'
          : reason,
    )}`,
    '',
    '<b>🤖 ИИ</b>',
    `Ошибок: <b>${aiErrTotal}</b>`,
    `По операциям: ${formatMap(ops.aiErrorsByContext, contextLabel)}`,
    `Обрезанных ответов: <b>${c.ai_truncated ?? 0}</b>`,
    `Нарушений формата: <b>${c.reading_format_thin ?? 0}</b>`,
    `Модели: ${formatMap(ops.aiSuccessByModel, modelLabel)}`,
    `Время ответа p95: ${latency}`,
    `По операциям p95: ${formatLatencyByContext(ops.aiLatencyByContext)}`,
  ];
  return lines.join('\n');
}
