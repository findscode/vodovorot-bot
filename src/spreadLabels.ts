import { hasUnlimitedSpreadAccess } from './accessResolve.js';
import type { AccessTier } from './accessTier.js';
import { canUseFullDeepFinal, resolveAccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer } from './calendarDayUserPhrases.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';
import { basicLevelPrefix, isPremiumTier, premiumFeaturePrefix } from './tierDisplay.js';

/** Подписи раскладов на inline-кнопках — единый источник для текстов бота. */
export const SPREAD_BUTTON_LABEL = {
  day: 'На день',
  spread: 'Прошлое — настоящее — будущее',
  deep: 'Глубинная диагностика',
} as const;

export function quotedSpreadLabel(label: string): string {
  return `«${label}»`;
}

/** Строка «emoji «Название»» для заголовков сессий и подписей. */
export function spreadTitleLineHtml(
  tier: AccessTier,
  spread: keyof typeof SPREAD_BUTTON_LABEL,
): string {
  const label = SPREAD_BUTTON_LABEL[spread];
  const prefix =
    spread === 'day'
      ? basicLevelPrefix()
      : spread === 'spread'
        ? isPremiumTier(tier)
          ? premiumFeaturePrefix()
          : basicLevelPrefix()
        : canUseFullDeepFinal(tier)
          ? premiumFeaturePrefix()
          : basicLevelPrefix();
  return `${prefix}${quotedSpreadLabel(label)}`;
}

export type SpreadAccessOverviewOpts = {
  tier: AccessTier;
  unlimitedSpread: boolean;
};

export function spreadAccessOptsForUser(userId: number | undefined): SpreadAccessOverviewOpts {
  return { tier: resolveAccessTier(userId), unlimitedSpread: hasUnlimitedSpreadAccess(userId) };
}

/** Обзор раскладов для /start и /menu: порядок как у кнопок в `mainSpreadRows` (day → spread → deep). */
export function spreadAccessOverviewHtml(opts: SpreadAccessOverviewOpts): string {
  const { tier, unlimitedSpread } = opts;
  const p = dayDrawPhrasesForServer();
  const lines: string[] = [];

  lines.push(
    `${basicLevelPrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — одна карта и толкование. Не чаще раза в ${p.dayLimitCalendar}.`,
  );

  const spreadLimitNote = unlimitedSpread
    ? 'без лимита'
    : `${SPREAD_MAX_FOR_BASIC} расклада за ${p.dayLimitCalendar} на базовом уровне`;
  lines.push(
    `${spreadTitleLineHtml(tier, 'spread')} — три карты по твоему вопросу (прошлое, настоящее, будущее), ${spreadLimitNote}.`,
  );

  const deepDesc = canUseFullDeepFinal(tier)
    ? 'до семи вопросов подряд; в конце — полный общий вывод.'
    : 'до трёх вопросов; в конце — короткий общий вывод. Семь вопросов и полный финал — ⭐️ Premium.';
  lines.push(`${spreadTitleLineHtml(tier, 'deep')} — ${deepDesc}`);

  return lines.join('\n\n');
}
