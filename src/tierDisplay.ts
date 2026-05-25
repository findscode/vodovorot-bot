import type { AccessTier } from './accessTier.js';
import { canUseFullDeepFinal, spreadUnlimitedForTier } from './accessTier.js';
import { dayDrawPhrasesForServer } from './calendarDayUserPhrases.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL, spreadTitleLineHtml } from './spreadLabels.js';

/**
 * Emoji-метки уровней (UI).
 * ⭐ — premium-возможности; 🌱 — базовый уровень (не ярлык «ты basic»);
 * 🍀 — админ (только /status и /admin).
 */
export const TIER_EMOJI = {
  premium: '⭐️',
  basic: '🌱',
  admin: '🍀',
} as const;

export function tierEmoji(tier: AccessTier): string {
  return TIER_EMOJI[tier];
}

export function isPremiumTier(tier: AccessTier): boolean {
  return tier === 'premium' || tier === 'admin';
}

/** Префикс для кнопок и пунктов справки с Premium-доступом. */
export function premiumFeaturePrefix(): string {
  return `${TIER_EMOJI.premium} `;
}

/** Префикс emoji для фич базового уровня (карта дня, укороченный deep). */
export function basicLevelPrefix(): string {
  return `${TIER_EMOJI.basic} `;
}

export function labelBasicLevelButton(label: string): string {
  return `${basicLevelPrefix()}${label}`;
}

export function labelPremiumButton(label: string): string {
  return `${premiumFeaturePrefix()}${label}`;
}

/** Заголовок фичи в HTML: `⭐️ <b>…</b>` или `<b>…</b>`. */
export function featureHeadingHtml(title: string, opts: { premiumMark: boolean }): string {
  const prefix = opts.premiumMark ? premiumFeaturePrefix() : '';
  return `${prefix}<b>${title}</b>`;
}

/** Строка статуса Premium / админа для /status. */
export function activeTierStatusLineHtml(tier: AccessTier): string {
  if (tier === 'admin') {
    return `${TIER_EMOJI.admin} <b>Админ</b> — полный доступ ко всем раскладам.`;
  }
  if (tier === 'premium') {
    return `${TIER_EMOJI.premium} <b>Premium</b> активен — доступны все расклады.`;
  }
  return `Доступны ${spreadTitleLineHtml('basic', 'day')}, ${spreadTitleLineHtml('basic', 'spread')} (до ${SPREAD_MAX_FOR_BASIC} в ${dayDrawPhrasesForServer().dayLimitCalendar}) и ${spreadTitleLineHtml('basic', 'deep')} (до трёх вопросов). Premium — по промокоду.`;
}

/** Подпись tier в админке: `🍀 admin`. */
export function tierLabelWithEmojiForAdmin(tier: AccessTier): string {
  return `${tierEmoji(tier)} ${tier}`;
}

/** Вступление к глубинной диагностике с учётом tier. */
export function deepIntroHtml(tier: AccessTier): string {
  const premiumDeep = canUseFullDeepFinal(tier);
  const prefix = premiumDeep ? premiumFeaturePrefix() : basicLevelPrefix();
  const heading = `${prefix}<b>${quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep)}</b>`;
  const body = premiumDeep
    ? 'До семи вопросов подряд — на каждый три карты и короткое толкование. В конце — общий вывод. Нажми <b>Начать</b>, когда будешь готов.'
    : `До трёх вопросов за одно гадание — на каждый три карты и толкование. Полный цикл (семь вопросов и общий вывод) — ${premiumFeaturePrefix()}Premium. Нажми <b>Начать</b>, когда будешь готов.`;
  return `${heading}\n\n${body}`;
}

export function deepIntroReadyHtml(tier: AccessTier): string {
  const premiumDeep = canUseFullDeepFinal(tier);
  const prefix = premiumDeep ? premiumFeaturePrefix() : basicLevelPrefix();
  const heading = `${prefix}<b>${quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep)}</b>`;
  return `${heading}\n\nНапиши первый вопрос или утверждение <b>одним сообщением</b> в чат — лучше <b>одна тема за раз</b>. Выйти можно кнопкой «Отмена».`;
}

/** Запрос темы перед раскладом «три карты». */
export function spreadIntroHtml(tier: AccessTier): string {
  const prefix = isPremiumTier(tier) ? premiumFeaturePrefix() : basicLevelPrefix();
  const heading = `${prefix}<b>${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)}</b>`;
  const howItWorks =
    'Три карты по позициям: <b>прошлое</b>, <b>настоящее</b> и <b>будущее</b> — вокруг твоего вопроса или темы. Сначала сформулируешь запрос, потом вытащим карты и свяжем их в одно толкование.';
  const limitNote = spreadUnlimitedForTier(tier)
    ? 'На ⭐️ Premium — без лимита.'
    : `На базовом уровне — ${SPREAD_MAX_FOR_BASIC} таких расклада за ${dayDrawPhrasesForServer().dayLimitCalendar}. Без лимита — ${premiumFeaturePrefix()}Premium.`;
  return `${heading}\n\n${howItWorks}\n\n${limitNote}\n\nНажми <b>Начать</b>, когда будешь готов.`;
}

export function spreadIntroReadyHtml(tier: AccessTier): string {
  const prefix = isPremiumTier(tier) ? premiumFeaturePrefix() : basicLevelPrefix();
  const heading = `${prefix}<b>${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)}</b>`;
  return `${heading}\n\nНапиши вопрос или тему <b>одним сообщением</b> в чат — лучше <b>одна тема за раз</b>, так расклад будет точнее. Выйти можно кнопкой «Отмена».`;
}
