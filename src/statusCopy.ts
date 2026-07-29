import { hasUnlimitedSpreadAccess, remainingSpreadDrawsForUser } from './accessResolve.js';
import { deepMaxTripletsForTier, spreadUnlimitedForTier } from './accessTier.js';
import { DISCLAIMER_HELP } from './botCopy.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { getDayPushScheduleForUserSync, isDayPushEnabledSync } from './db/usersRepo.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL, spreadTitleLineHtml } from './spreadLabels.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';
import { activeTierStatusLineHtml, basicLevelPrefix, premiumFeaturePrefix } from './tierDisplay.js';
import {
  buildHelpSummaryLines,
  collectUserHelpFacts,
  deepFinalPhraseForTier,
  formatPremiumUntilRu,
  READING_VOICE_HELP_LINE,
} from './userHelpContent.js';

/** Справка: уровень доступа, расклады, рассылка (`/help full`; `/status` — то же). */
export function helpTextHtml(userId: number): string {
  const facts = collectUserHelpFacts(userId);
  const tier = facts.tier;
  const unlimitedSpread = hasUnlimitedSpreadAccess(userId);
  const maxDeep = deepMaxTripletsForTier(tier);
  const phrases = dayDrawPhrasesForServer();
  const lines: string[] = [];

  lines.push('<b>Справка</b>', '', activeTierStatusLineHtml(tier));

  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const remaining = remainingSpreadDrawsForUser(userId);
  const spreadStatus = unlimitedSpread
    ? `• ${spreadTitleLineHtml(tier, 'spread')} — доступен, без лимита`
    : `• ${spreadTitleLineHtml(tier, 'spread')} — доступен, осталось ${remaining ?? 0} из ${SPREAD_MAX_FOR_BASIC}`;
  const deepFinalNote = `, ${deepFinalPhraseForTier(tier)}`;
  lines.push(
    '',
    '<b>Расклады</b>',
    `• ${basicLevelPrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — доступен`,
    `• ${spreadTitleLineHtml(tier, 'deep')} — до ${maxDeep} вопросов за гадание${deepFinalNote}`,
    spreadStatus,
    '',
    READING_VOICE_HELP_LINE,
    '',
    `Лимит ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}: не чаще раза в ${phrases.dayLimitCalendar}.`,
  );
  if (!spreadUnlimitedForTier(tier)) {
    lines.push(
      `Лимит ${spreadQ}: ${SPREAD_MAX_FOR_BASIC} расклада за ${phrases.dayLimitCalendar} на базовом уровне (сначала «Начать», потом вопрос).`,
    );
  }

  if (facts.premiumUntil && tier !== 'admin') {
    lines.push(
      '',
      `${premiumFeaturePrefix()}<b>Premium</b> до <b>${formatPremiumUntilRu(facts.premiumUntil)}</b>.`,
    );
  }

  const push = getDayPushScheduleForUserSync(userId);
  if (push && isDayPushEnabledSync(userId)) {
    const t = formatHhmmForUser(push.hhmm);
    lines.push('', `<b>Рассылка</b>: включена, около ${t}.`);
  } else if (push) {
    lines.push(
      '',
      '<b>Рассылка</b>: временно недоступна на сервере. Подписка сохранена и заработает после возобновления рассылки.',
    );
  } else {
    lines.push(
      '',
      `<b>Рассылка</b>: выключена. Включить — в <b>Меню</b> у поля ввода или кнопкой «Присылать каждый день» под толкованием ${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)}.`,
    );
  }

  lines.push('', DISCLAIMER_HELP);

  return lines.join('\n');
}

/** Краткая справка plain-text (Mini App parity check). */
export function helpSummaryPlain(userId: number): string[] {
  return buildHelpSummaryLines(collectUserHelpFacts(userId));
}

/** @deprecated Используй {@link helpTextHtml}. */
export const statusTextHtml = helpTextHtml;
