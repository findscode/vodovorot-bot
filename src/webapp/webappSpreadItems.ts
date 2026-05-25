import {
  canUseSpread,
  hasUnlimitedSpreadAccess,
  remainingSpreadDrawsForUser,
} from '../accessResolve.js';
import { isFullDeepFinal, resolveAccessTier } from '../accessTier.js';
import { dayDrawPhrasesForServer } from '../calendarDayUserPhrases.js';
import { hasDayDrawSlotUsed, dayDrawCalendarDate } from '../dayDrawState.js';
import { SPREAD_MAX_FOR_BASIC } from '../spreadConstants.js';
import { SPREAD_BUTTON_LABEL } from '../spreadLabels.js';
import { basicLevelPrefix, premiumFeaturePrefix } from '../tierDisplay.js';
import type { WebAppLaunchAction } from './webappLaunchPayload.js';

export type WebAppSpreadItem = {
  action: WebAppLaunchAction;
  label: string;
  tierPrefix: string;
  enabled: boolean;
  hint: string | null;
};

export async function buildWebAppSpreadItems(userId: number): Promise<WebAppSpreadItem[]> {
  const tier = resolveAccessTier(userId);
  const phrases = dayDrawPhrasesForServer();
  const dayUsed = await hasDayDrawSlotUsed(userId, dayDrawCalendarDate());
  const spreadRemaining = remainingSpreadDrawsForUser(userId);
  const spreadOk = canUseSpread(userId);

  const dayHint = dayUsed ? `Уже получена за ${phrases.dayLimitCalendar}` : null;
  const spreadHint =
    tier === 'basic' && !spreadOk
      ? `Лимит ${SPREAD_MAX_FOR_BASIC} за ${phrases.dayLimitCalendar}`
      : tier === 'basic' && spreadRemaining !== null
        ? `Осталось ${spreadRemaining} из ${SPREAD_MAX_FOR_BASIC}`
        : null;

  const deepPrefix = isFullDeepFinal(tier) ? premiumFeaturePrefix() : basicLevelPrefix();

  return [
    {
      action: 'day',
      label: SPREAD_BUTTON_LABEL.day,
      tierPrefix: basicLevelPrefix(),
      enabled: !dayUsed,
      hint: dayHint,
    },
    {
      action: 'spread',
      label: SPREAD_BUTTON_LABEL.spread,
      tierPrefix: hasUnlimitedSpreadAccess(userId) ? premiumFeaturePrefix() : basicLevelPrefix(),
      enabled: spreadOk,
      hint: spreadHint,
    },
    {
      action: 'deep',
      label: SPREAD_BUTTON_LABEL.deep,
      tierPrefix: deepPrefix,
      enabled: true,
      hint: null,
    },
  ];
}
