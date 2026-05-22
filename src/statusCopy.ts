import { hasFullSpreadAccess } from './accessResolve.js';
import { canUseFullDeepFinal, deepMaxTripletsForTier, resolveAccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { getActivePremiumUntilSync, getDayPushScheduleForUserSync } from './db/usersRepo.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL, spreadTitleLineHtml } from './spreadLabels.js';
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

  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const spreadStatus = full
    ? `• ${premiumFeaturePrefix()}${spreadQ} — доступен`
    : `• ${premiumFeaturePrefix()}${spreadQ} — <code>/promo</code>`;
  const deepFinalNote = canUseFullDeepFinal(tier) ? ', с общим финалом' : ', без общего финала';
  lines.push(
    '<b>Расклады</b>',
    `• ${basicTrackPrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — доступен`,
    `• ${spreadTitleLineHtml(tier, 'deep')} — до ${maxDeep} вопросов за гадание${deepFinalNote}`,
    spreadStatus,
  );

  lines.push(
    `Лимит ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}: не чаще раза в ${phrases.dayLimitCalendar}.`,
  );

  const prem = getActivePremiumUntilSync(userId);
  if (prem && tier !== 'admin') {
    lines.push(`${premiumFeaturePrefix()}<b>Premium</b> до <b>${formatPremiumUntilRu(prem)}</b>.`);
  }

  const push = getDayPushScheduleForUserSync(userId);
  if (push) {
    const t = formatHhmmForUser(push.hhmm);
    lines.push(`<b>Рассылка</b>: включена, ориентир по времени — около ${t}.`);
  } else {
    lines.push(
      `<b>Рассылка</b>: выключена. Включить — кнопкой «Присылать каждый день» под толкованием ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}.`,
    );
  }

  lines.push(
    'Команды: <code>/menu</code>, <code>/help</code>, <code>/promo КОД</code>, <code>/last</code>, <code>/pushtime</code> (если рассылка включена).',
  );

  return lines.join('\n\n');
}
