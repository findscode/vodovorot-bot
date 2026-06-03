import { deepMaxTripletsForTier, resolveAccessTier, type AccessTier } from '../accessTier.js';
import { DISCLAIMER_HELP } from '../botCopy.js';
import { DAY_PUSH_HHMM_PRESETS } from '../dayPushPresets.js';
import { getDayDrawTimezone } from '../dayDrawState.js';
import { isDayPushDeliveryEnabled } from '../dayPushConfig.js';
import {
  getDayPushScheduleForUserSync,
  getOrCreateUser,
  isDayPushEnabledSync,
} from '../db/usersRepo.js';
import { SPREAD_MAX_FOR_BASIC } from '../spreadConstants.js';
import { tierEmoji } from '../tierDisplay.js';
import {
  buildHelpSummaryLines,
  collectUserHelpFacts,
  formatPremiumUntilRu,
} from '../userHelpContent.js';
import { webappPrivacyUrl } from './webappConfig.js';

import { buildWebAppSpreadItems, type WebAppSpreadItem } from './webappSpreadItems.js';

export type WebAppSettingsDto = {
  tier: AccessTier;
  tierEmoji: string;
  premiumUntil: string | null;
  dayPush: {
    enabled: boolean;
    /** Глобально ли доступна подписка (`DAY_PUSH_ENABLED`). */
    available: boolean;
    hhmm: string | null;
    timezone: string;
  };
  limits: {
    spreadRemaining: number | null;
    spreadMax: number | null;
    deepMaxTriplets: number;
    dayLimitPhrase: string;
  };
  spreads: WebAppSpreadItem[];
  disclaimer: string;
  helpSummary: string[];
  privacyUrl: string;
  pushPresets: string[];
};

/** JSON для Mini App «Меню» (#55, #4.4). */
export async function webAppSettingsDto(userId: number): Promise<WebAppSettingsDto> {
  getOrCreateUser(userId);
  const facts = collectUserHelpFacts(userId);
  const tier = resolveAccessTier(userId);
  const pushRow = getDayPushScheduleForUserSync(userId);
  const tz = pushRow?.timezoneIana ?? getDayDrawTimezone();

  return {
    tier,
    tierEmoji: tierEmoji(tier),
    premiumUntil: facts.premiumUntil ? formatPremiumUntilRu(facts.premiumUntil) : null,
    dayPush: {
      enabled: isDayPushEnabledSync(userId),
      available: isDayPushDeliveryEnabled(),
      hhmm: pushRow?.hhmm ?? null,
      timezone: tz,
    },
    limits: {
      spreadRemaining: facts.spreadRemaining,
      spreadMax: facts.unlimitedSpread ? null : SPREAD_MAX_FOR_BASIC,
      deepMaxTriplets: deepMaxTripletsForTier(tier),
      dayLimitPhrase: facts.dayLimitPhrase,
    },
    disclaimer: DISCLAIMER_HELP,
    helpSummary: buildHelpSummaryLines(facts),
    privacyUrl: webappPrivacyUrl(),
    pushPresets: [...DAY_PUSH_HHMM_PRESETS],
    spreads: await buildWebAppSpreadItems(userId),
  };
}
