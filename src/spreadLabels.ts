import { hasFullSpreadAccess } from './accessResolve.js';
import type { AccessTier } from './accessTier.js';
import { canUseFullDeepFinal, resolveAccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer } from './calendarDayUserPhrases.js';
import { basicTrackPrefix, premiumFeaturePrefix } from './tierDisplay.js';

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
      ? basicTrackPrefix()
      : spread === 'spread'
        ? premiumFeaturePrefix()
        : canUseFullDeepFinal(tier)
          ? premiumFeaturePrefix()
          : basicTrackPrefix();
  return `${prefix}${quotedSpreadLabel(label)}`;
}

export type SpreadAccessOverviewOpts = {
  tier: AccessTier;
  fullSpread: boolean;
};

export function spreadAccessOptsForUser(userId: number | undefined): SpreadAccessOverviewOpts {
  return { tier: resolveAccessTier(userId), fullSpread: hasFullSpreadAccess(userId) };
}

/** Обзор раскладов для /start и /menu: каждый расклад — отдельный абзац, пустая строка между ними. */
export function spreadAccessOverviewHtml(opts: SpreadAccessOverviewOpts): string {
  const { tier, fullSpread } = opts;
  const p = dayDrawPhrasesForServer();
  const lines: string[] = [];

  lines.push(
    `${basicTrackPrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — одна карта и толкование. Не чаще раза в ${p.dayLimitCalendar}.`,
  );

  const deepDesc = canUseFullDeepFinal(tier)
    ? 'до семи вопросов за гадание; в конце — общий вывод.'
    : 'до трёх вопросов за гадание; полный цикл — ⭐️ Premium (<code>/promo</code>).';
  lines.push(`${spreadTitleLineHtml(tier, 'deep')} — ${deepDesc}`);

  if (fullSpread) {
    lines.push(
      `${premiumFeaturePrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)} — три карты и связное толкование.`,
    );
  } else {
    lines.push(
      `${premiumFeaturePrefix()}${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)} — с Premium: <code>/promo КОД</code>.`,
    );
  }

  return lines.join('\n\n');
}
