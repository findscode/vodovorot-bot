import { remainingSpreadDrawsForUser } from './accessResolve.js';
import {
  deepMaxTripletsForTier,
  isFullDeepFinal,
  resolveAccessTier,
  spreadUnlimitedForTier,
  type AccessTier,
} from './accessTier.js';
import { dayDrawPhrasesForServer } from './calendarDayUserPhrases.js';
import {
  getActivePremiumUntilSync,
  getDayPushScheduleForUserSync,
  getOrCreateUser,
  isDayPushEnabledSync,
} from './db/usersRepo.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL } from './spreadLabels.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';

export function formatPremiumUntilRu(d: Date): string {
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

export function tierPlainLabel(tier: AccessTier): string {
  if (tier === 'admin') return 'Админ — полный доступ';
  if (tier === 'premium') return 'Premium активен';
  return 'Базовый уровень';
}

/** Фраза про финал deep для справки (единый источник #57). */
export function deepFinalPhraseForTier(tier: AccessTier): string {
  return isFullDeepFinal(tier) ? 'с полным общим финалом' : 'с коротким общим выводом';
}

export type UserHelpFacts = {
  tier: AccessTier;
  unlimitedSpread: boolean;
  spreadRemaining: number | null;
  deepMax: number;
  dayLimitPhrase: string;
  pushEnabled: boolean;
  pushHhmm: string | null;
  premiumUntil: Date | null;
};

export function collectUserHelpFacts(userId: number): UserHelpFacts {
  getOrCreateUser(userId);
  const tier = resolveAccessTier(userId);
  const unlimitedSpread = spreadUnlimitedForTier(tier);
  const phrases = dayDrawPhrasesForServer();
  const pushRow = getDayPushScheduleForUserSync(userId);
  return {
    tier,
    unlimitedSpread,
    spreadRemaining: unlimitedSpread ? null : remainingSpreadDrawsForUser(userId),
    deepMax: deepMaxTripletsForTier(tier),
    dayLimitPhrase: phrases.dayLimitCalendar,
    pushEnabled: isDayPushEnabledSync(userId),
    pushHhmm: pushRow?.hhmm ?? null,
    premiumUntil: getActivePremiumUntilSync(userId),
  };
}

/** Plain-text строки справки (Mini App, fallback). */
export function buildHelpSummaryLines(facts: UserHelpFacts): string[] {
  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const deepQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep);
  const dayQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.day);
  const lines = [
    tierPlainLabel(facts.tier),
    `${dayQ} — доступен`,
    `${deepQ} — до ${facts.deepMax} вопросов за гадание, ${deepFinalPhraseForTier(facts.tier)}`,
    facts.unlimitedSpread
      ? `${spreadQ} — без лимита`
      : `${spreadQ} — осталось ${facts.spreadRemaining ?? 0} из ${SPREAD_MAX_FOR_BASIC} за ${facts.dayLimitPhrase}`,
    facts.pushEnabled
      ? `Рассылка «На день» включена, около ${facts.pushHhmm ?? '—'}`
      : 'Рассылка «На день» выключена',
  ];
  if (facts.premiumUntil && facts.tier !== 'admin') {
    lines.push(`Premium до ${formatPremiumUntilRu(facts.premiumUntil)}`);
  }
  return lines;
}
