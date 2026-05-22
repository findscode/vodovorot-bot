import { hasFullSpreadAccess } from './accessResolve.js';
import { canUseFullDeepFinal, deepMaxTripletsForTier, resolveAccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { getActivePremiumUntilSync, getDayPushScheduleForUserSync } from './db/usersRepo.js';
import { activeTierStatusLineHtml, basicTrackPrefix, premiumFeaturePrefix } from './tierDisplay.js';

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
  const full = hasFullSpreadAccess(userId);
  const tier = resolveAccessTier(userId);
  const maxDeep = deepMaxTripletsForTier(tier);
  const phrases = dayDrawPhrasesForServer();
  const lines: string[] = [];

  lines.push(activeTierStatusLineHtml(tier));

  const spreadStatus = full
    ? `• ${premiumFeaturePrefix()}<b>Прошлое — настоящее — будущее</b> — доступен`
    : `• ${premiumFeaturePrefix()}<b>Прошлое — настоящее — будущее</b> — <code>/promo</code>`;
  const deepPrefix = canUseFullDeepFinal(tier) ? premiumFeaturePrefix() : basicTrackPrefix();
  const deepFinalNote = canUseFullDeepFinal(tier) ? ', с общим финалом' : ', без общего финала';
  lines.push(
    '<b>Расклады</b>',
    `• ${basicTrackPrefix()}<b>На день</b> — доступен`,
    `• ${deepPrefix}<b>Глубинная диагностика</b> — до ${maxDeep} вопросов за гадание${deepFinalNote}`,
    spreadStatus,
  );

  lines.push(`Лимит «На день»: не чаще раза в ${phrases.dayLimitCalendar}.`);

  const prem = getActivePremiumUntilSync(userId);
  if (prem && tier !== 'admin') {
    lines.push(`${premiumFeaturePrefix()}<b>Premium</b> до <b>${formatPremiumUntilRu(prem)}</b>.`);
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
    'Команды: <code>/menu</code>, <code>/help</code>, <code>/promo КОД</code>, <code>/last</code>, <code>/pushtime</code> (если рассылка включена).',
  );

  return lines.join('\n\n');
}
