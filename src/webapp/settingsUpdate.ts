import { getDayDrawTimezone } from '../dayDrawState.js';
import { getDefaultDayPushHhmm, isDayPushDeliveryEnabled } from '../dayPushConfig.js';
import { isAllowedDayPushHhmm, normalizeDayPushHhmm } from '../dayPushPresets.js';
import { setDayPushEnabled, setDayPushLocalHhmmSync } from '../db/usersRepo.js';

export type WebAppSettingsPatch = {
  dayPushEnabled?: boolean;
  dayPushHhmm?: string;
};

export type WebAppSettingsPatchResult = { ok: true } | { ok: false; error: string };

export function applyWebAppSettingsPatch(
  userId: number,
  patch: WebAppSettingsPatch,
): WebAppSettingsPatchResult {
  const tz = getDayDrawTimezone();

  if (patch.dayPushEnabled === true) {
    if (!isDayPushDeliveryEnabled()) {
      return { ok: false, error: 'push_paused' };
    }
    const hhmm =
      patch.dayPushHhmm !== undefined
        ? normalizeDayPushHhmm(patch.dayPushHhmm)
        : getDefaultDayPushHhmm();
    if (patch.dayPushHhmm !== undefined && !hhmm) {
      return { ok: false, error: 'invalid_hhmm' };
    }
    setDayPushEnabled(userId, true, tz, hhmm ?? getDefaultDayPushHhmm());
  } else if (patch.dayPushEnabled === false) {
    setDayPushEnabled(userId, false, tz);
  }

  if (patch.dayPushHhmm !== undefined && patch.dayPushEnabled !== true) {
    const canonical = normalizeDayPushHhmm(patch.dayPushHhmm);
    if (!canonical || !isAllowedDayPushHhmm(canonical)) {
      return { ok: false, error: 'invalid_hhmm' };
    }
    if (!setDayPushLocalHhmmSync(userId, canonical)) {
      return { ok: false, error: 'push_disabled' };
    }
  }

  return { ok: true };
}
