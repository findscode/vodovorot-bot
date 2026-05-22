import { isValidIanaTimeZone, parseConfiguredHm } from './pushSchedule.js';

export type DayPushSkipReason =
  | 'already_sent_today'
  | 'before_local_time'
  | 'invalid_local_hhmm'
  | 'invalid_timezone';

export type DayPushTickDecision =
  | { action: 'skip'; reason: DayPushSkipReason }
  | { action: 'skip_slot_already_used' }
  | { action: 'deliver' };

export type DayPushSubscriberInput = {
  day_push_last_sent_date: string | null;
  day_push_timezone: string;
  day_push_local_hhmm: string;
};

export type DayPushTickContext = {
  todayKey: string;
  slotUsedToday: boolean;
  isAtOrPastLocalHm: (now: Date, timeZone: string, hhmm: string) => boolean;
  now: Date;
};

/** Решение для одного подписчика на тике планировщика. */
export function decideDayPushTick(
  sub: DayPushSubscriberInput,
  ctx: DayPushTickContext,
): DayPushTickDecision {
  const { todayKey, slotUsedToday, isAtOrPastLocalHm, now } = ctx;
  const tz = sub.day_push_timezone;
  const hhmm = sub.day_push_local_hhmm;

  if (!parseConfiguredHm(hhmm)) {
    return { action: 'skip', reason: 'invalid_local_hhmm' };
  }
  if (!isValidIanaTimeZone(tz)) {
    return { action: 'skip', reason: 'invalid_timezone' };
  }

  if (sub.day_push_last_sent_date === todayKey) {
    return { action: 'skip', reason: 'already_sent_today' };
  }

  if (!isAtOrPastLocalHm(now, tz, hhmm)) {
    return { action: 'skip', reason: 'before_local_time' };
  }

  if (slotUsedToday) return { action: 'skip_slot_already_used' };

  return { action: 'deliver' };
}
