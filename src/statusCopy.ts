import { hasFullSpreadAccess } from './accessResolve.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { getActivePremiumUntilSync, getDayPushScheduleForUserSync } from './db/usersRepo.js';
import { getAccessWhitelist } from './runtimeConfig.js';

function formatPremiumUntilRu(d: Date): string {
  try {
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Справка по доступу и подписке для команды /status (HTML).
 */
export function statusTextHtml(userId: number): string {
  const wl = getAccessWhitelist();
  const full = hasFullSpreadAccess(userId);
  const phrases = dayDrawPhrasesForServer();
  const lines: string[] = [];

  if (wl === null) {
    lines.push('<b>Доступ</b>: открытый режим — все расклады доступны.');
  } else if (full) {
    lines.push('<b>Доступ</b>: полный — «На день» и «Прошлое — настоящее — будущее».');
  } else {
    lines.push(
      '<b>Доступ</b>: «На день», подписка и глубинная диагностика. «Прошлое — настоящее — будущее» — по приглашению, Premium или промокоду (<code>/promo</code>).',
    );
  }

  const spreadStatus =
    wl === null || full
      ? '• <b>Прошлое — настоящее — будущее</b> — доступен'
      : '• <b>Прошлое — настоящее — будущее</b> — Premium, промокод или список доступа';
  lines.push(
    '<b>Расклады</b>',
    '• <b>На день</b> — доступен',
    '• <b>Глубинная диагностика</b> — доступна (до 7 вопросов за гадание)',
    spreadStatus,
  );

  lines.push(`Лимит «На день»: не чаще раза в сутки ${phrases.dayLimitCalendar}.`);

  const prem = getActivePremiumUntilSync(userId);
  if (prem) {
    lines.push(`<b>Premium</b> активен до <b>${formatPremiumUntilRu(prem)}</b>.`);
  }

  const push = getDayPushScheduleForUserSync(userId);
  if (push) {
    const t = formatHhmmForUser(push.hhmm);
    lines.push(`<b>Рассылка карты дня</b>: включена. Ориентир по времени — около ${t}.`);
  } else {
    lines.push(
      '<b>Рассылка карты дня</b>: выключена. Включить — кнопкой «Присылать каждый день» под толкованием «На день».',
    );
  }

  lines.push(
    'Команды: <code>/menu</code>, <code>/help</code>, <code>/last</code>, <code>/pushtime</code> (если рассылка включена), <code>/promo</code>.',
  );

  return lines.join('\n\n');
}
