import {
  countActivePremiumSync,
  countDayPushSubscribersSync,
  countUsersSync,
} from './db/usersRepo.js';
import { getOpsStatsSnapshot } from './opsLog.js';

/** HTML для `/admin stats` (#62). */
export function adminStatsHtml(): string {
  const ops = getOpsStatsSnapshot();
  const c = ops.counts;
  const aiErrTotal = c.ai_error ?? 0;
  const aiContexts = Object.entries(ops.aiErrorsByContext)
    .map(([ctx, n]) => `${ctx}: ${n}`)
    .join(', ');
  const latency =
    ops.aiLatencySampleCount > 0
      ? `p95 ${ops.aiLatencyP95Ms ?? '—'} ms (n=${ops.aiLatencySampleCount})`
      : 'нет выборки';

  const lines = [
    '<b>Статистика</b>',
    `Пользователей в БД: <b>${countUsersSync()}</b>`,
    `Активный Premium: <b>${countActivePremiumSync()}</b>`,
    `Подписчиков «На день»: <b>${countDayPushSubscribersSync()}</b>`,
    '',
    `<b>За сутки</b> (${ops.dayKey}, in-memory):`,
    `Spread завершён: <b>${c.spread_completed ?? 0}</b>`,
    `Spread лимит: <b>${c.spread_limit_hit ?? 0}</b>`,
    `Deep стартов: <b>${c.deep_session_start ?? 0}</b>`,
    `Deep финал (basic): <b>${c.deep_final_basic ?? 0}</b>`,
    `Deep финал (premium): <b>${c.deep_final_full ?? 0}</b>`,
    `Deep лимит триплетов: <b>${c.deep_triplet_limit_hit ?? 0}</b>`,
    `«На день» выдано: <b>${c.day_draw_delivered ?? 0}</b>`,
    `Clarity skip: <b>${c.question_clarity_skip ?? 0}</b>, prompted: <b>${c.question_clarity_prompted ?? 0}</b>`,
    `Ошибки ИИ: <b>${aiErrTotal}</b>${aiContexts ? ` (${aiContexts})` : ''}`,
    `Latency ИИ: ${latency}`,
  ];
  return lines.join('\n');
}
