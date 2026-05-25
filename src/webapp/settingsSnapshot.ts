import { remainingSpreadDrawsForUser } from '../accessResolve.js';
import {
  deepMaxTripletsForTier,
  resolveAccessTier,
  spreadUnlimitedForTier,
  type AccessTier,
} from '../accessTier.js';
import { DISCLAIMER_HELP } from '../botCopy.js';
import { dayDrawPhrasesForServer } from '../calendarDayUserPhrases.js';
import { DAY_PUSH_HHMM_PRESETS } from '../dayPushPresets.js';
import { getDayDrawTimezone } from '../dayDrawState.js';
import {
  getActivePremiumUntilSync,
  getDayPushScheduleForUserSync,
  getOrCreateUser,
  isDayPushEnabledSync,
} from '../db/usersRepo.js';
import { SPREAD_MAX_FOR_BASIC } from '../spreadConstants.js';
import { quotedSpreadLabel, SPREAD_BUTTON_LABEL } from '../spreadLabels.js';
import { tierEmoji } from '../tierDisplay.js';
import { webappPrivacyUrl } from './webappConfig.js';

export type WebAppSettingsDto = {
  tier: AccessTier;
  tierEmoji: string;
  premiumUntil: string | null;
  dayPush: {
    enabled: boolean;
    hhmm: string | null;
    timezone: string;
  };
  limits: {
    spreadRemaining: number | null;
    spreadMax: number | null;
    deepMaxTriplets: number;
    dayLimitPhrase: string;
  };
  disclaimer: string;
  helpSummary: string[];
  privacyUrl: string;
  pushPresets: string[];
};

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

function tierPlainLabel(tier: AccessTier): string {
  if (tier === 'admin') return 'Админ — полный доступ';
  if (tier === 'premium') return 'Premium активен';
  return 'Базовый уровень';
}

/** JSON для Mini App «Настройки» (#55). */
export function webAppSettingsDto(userId: number): WebAppSettingsDto {
  getOrCreateUser(userId);
  const tier = resolveAccessTier(userId);
  const phrases = dayDrawPhrasesForServer();
  const unlimitedSpread = spreadUnlimitedForTier(tier);
  const remaining = unlimitedSpread ? null : remainingSpreadDrawsForUser(userId);
  const pushRow = getDayPushScheduleForUserSync(userId);
  const prem = getActivePremiumUntilSync(userId);
  const tz = pushRow?.timezoneIana ?? getDayDrawTimezone();

  const helpSummary = [
    tierPlainLabel(tier),
    `${quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)} — доступен`,
    `${quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep)} — до ${deepMaxTripletsForTier(tier)} вопросов за гадание`,
    unlimitedSpread
      ? `${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)} — без лимита`
      : `${quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread)} — осталось ${remaining ?? 0} из ${SPREAD_MAX_FOR_BASIC} за ${phrases.dayLimitCalendar}`,
    isDayPushEnabledSync(userId)
      ? `Рассылка «На день» включена, около ${pushRow?.hhmm ?? '—'}`
      : 'Рассылка «На день» выключена',
  ];

  return {
    tier,
    tierEmoji: tierEmoji(tier),
    premiumUntil: prem ? formatPremiumUntilRu(prem) : null,
    dayPush: {
      enabled: isDayPushEnabledSync(userId),
      hhmm: pushRow?.hhmm ?? null,
      timezone: tz,
    },
    limits: {
      spreadRemaining: remaining,
      spreadMax: unlimitedSpread ? null : SPREAD_MAX_FOR_BASIC,
      deepMaxTriplets: deepMaxTripletsForTier(tier),
      dayLimitPhrase: phrases.dayLimitCalendar,
    },
    disclaimer: DISCLAIMER_HELP,
    helpSummary,
    privacyUrl: webappPrivacyUrl(),
    pushPresets: [...DAY_PUSH_HHMM_PRESETS],
  };
}
