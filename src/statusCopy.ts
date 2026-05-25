import { hasUnlimitedSpreadAccess, remainingSpreadDrawsForUser } from './accessResolve.js';
import {
  canUseFullDeepFinal,
  deepMaxTripletsForTier,
  resolveAccessTier,
  spreadUnlimitedForTier,
} from './accessTier.js';
import { DISCLAIMER_HELP } from './botCopy.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { getActivePremiumUntilSync, getDayPushScheduleForUserSync } from './db/usersRepo.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL, spreadTitleLineHtml } from './spreadLabels.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';
import { activeTierStatusLineHtml, basicLevelPrefix, premiumFeaturePrefix } from './tierDisplay.js';

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

/** Справка: уровень доступа, расклады, рассылка (`/help`; `/status` — то же). */
export function helpTextHtml(userId: number): string {
  const unlimitedSpread = hasUnlimitedSpreadAccess(userId);
  const tier = resolveAccessTier(userId);
  const maxDeep = deepMaxTripletsForTier(tier);
  const phrases = dayDrawPhrasesForServer();
  const lines: string[] = [];

  lines.push('<b>Справка</b>', '', activeTierStatusLineHtml(tier));

  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const remaining = remainingSpreadDrawsForUser(userId);
  const spreadStatus = unlimitedSpread
    ? `• ${spreadTitleLineHtml(tier, 'spread')} — доступен, без лимита`
    : `• ${spreadTitleLineHtml(tier, 'spread')} — доступен, осталось ${remaining ?? 0} из ${SPREAD_MAX_FOR_BASIC}`;
  const deepFinalNote = canUseFullDeepFinal(tier) ? ', с общим финалом' : ', без общего финала';
  lines.push(
    '',
    '<b>Расклады</b>',
    `• ${basicLevelPrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — доступен`,
    `• ${spreadTitleLineHtml(tier, 'deep')} — до ${maxDeep} вопросов за гадание${deepFinalNote}`,
    spreadStatus,
    '',
    `Лимит ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}: не чаще раза в ${phrases.dayLimitCalendar}.`,
  );
  if (!spreadUnlimitedForTier(tier)) {
    lines.push(
      `Лимит ${spreadQ}: ${SPREAD_MAX_FOR_BASIC} расклада за ${phrases.dayLimitCalendar} на базовом уровне (сначала «Начать», потом вопрос).`,
    );
  }

  const prem = getActivePremiumUntilSync(userId);
  if (prem && tier !== 'admin') {
    lines.push(
      '',
      `${premiumFeaturePrefix()}<b>Premium</b> до <b>${formatPremiumUntilRu(prem)}</b>.`,
    );
  }

  const push = getDayPushScheduleForUserSync(userId);
  if (push) {
    const t = formatHhmmForUser(push.hhmm);
    lines.push('', `<b>Рассылка</b>: включена, около ${t}.`);
  } else {
    lines.push(
      '',
      `<b>Рассылка</b>: выключена. Включить — кнопкой «Присылать каждый день» под толкованием ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}.`,
    );
  }

  lines.push('', DISCLAIMER_HELP);

  return lines.join('\n');
}

/** @deprecated Используй {@link helpTextHtml}. */
export const statusTextHtml = helpTextHtml;
