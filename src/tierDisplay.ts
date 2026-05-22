import type { AccessTier } from './accessTier.js';
import { canUseFullDeepFinal } from './accessTier.js';

/**
 * Emoji-метки уровней (UI).
 * ⭐ — premium-возможности; 🌱 — базовый трек (не ярлык «ты basic»);
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

/** Префикс для фич базового трека (карта дня, укороченный deep). */
export function basicTrackPrefix(): string {
  return `${TIER_EMOJI.basic} `;
}

export function labelPremiumButton(label: string): string {
  return `${premiumFeaturePrefix()}${label}`;
}

export function labelBasicTrackButton(label: string): string {
  return `${basicTrackPrefix()}${label}`;
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
    return `${TIER_EMOJI.premium} <b>Premium</b> активен — все расклады и полная глубинная диагностика.`;
  }
  return 'Доступны карта дня и глубинная диагностика до трёх вопросов. Полный доступ — <code>/promo КОД</code>.';
}

/** Подпись tier в админке: `🍀 admin`. */
export function tierLabelWithEmojiForAdmin(tier: AccessTier): string {
  return `${tierEmoji(tier)} ${tier}`;
}

/** Вступление к глубинной диагностике с учётом tier. */
export function deepIntroHtml(tier: AccessTier): string {
  const premiumDeep = canUseFullDeepFinal(tier);
  const heading = featureHeadingHtml('Глубинная диагностика', { premiumMark: premiumDeep });
  const body = premiumDeep
    ? 'До семи вопросов подряд — на каждый три карты и короткое толкование. В конце — общий вывод. Нажми <b>Начать</b>, когда будешь готов.'
    : `До трёх вопросов за одно гадание — на каждый три карты и толкование. Полный цикл (семь вопросов и общий вывод) — ${premiumFeaturePrefix()}Premium. Нажми <b>Начать</b>, когда будешь готов.`;
  return `${heading}\n\n${body}`;
}

export function deepIntroReadyHtml(tier: AccessTier): string {
  const premiumDeep = canUseFullDeepFinal(tier);
  const heading = featureHeadingHtml('Глубинная диагностика', { premiumMark: premiumDeep });
  return `${heading}\n\nНапиши первый вопрос или утверждение <b>одним сообщением</b> в чат. Выйти можно кнопкой «Отмена».`;
}
