import { hasFullSpreadAccess } from './accessResolve.js';
import {
  dayDrawPhrasesForServer,
  formatHhmmForUser,
  phrasesForIanaTimezone,
} from './calendarDayUserPhrases.js';
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
    lines.push('<b>Доступ</b>: открытый режим — оба расклада доступны.');
  } else if (full) {
    lines.push('<b>Доступ</b>: полный — «на день» и расклад в три карты.');
  } else {
    lines.push(
      '<b>Доступ</b>: сейчас только «карта на день» и подписка. Расклад в три карты — по приглашению, Premium или промокоду (<code>/promo</code>).',
    );
  }

  lines.push(`Лимит «на день»: не чаще раза в сутки ${phrases.dayLimitCalendar}.`);

  const prem = getActivePremiumUntilSync(userId);
  if (prem) {
    lines.push(`<b>Premium</b> активен до <b>${formatPremiumUntilRu(prem)}</b>.`);
  }

  const push = getDayPushScheduleForUserSync(userId);
  if (push) {
    const clock = phrasesForIanaTimezone(push.timezoneIana);
    const t = formatHhmmForUser(push.hhmm);
    lines.push(
      `<b>Рассылка «карта дня»</b>: включена. Ориентир по времени — около ${t} (${clock.pushClockInstrumental}).`,
    );
  } else {
    lines.push('<b>Рассылка «карта дня»</b>: выключена. Включить — кнопкой под разбором «на день».');
  }

  lines.push(
    'Команды: <code>/menu</code>, <code>/help</code>, <code>/last</code>, <code>/pushtime</code> (если рассылка включена), <code>/promo</code>.',
  );

  return lines.join('\n\n');
}
