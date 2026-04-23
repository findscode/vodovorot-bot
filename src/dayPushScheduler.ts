import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { deliverCardOfDayReading } from './cardOfDayDelivery.js';
import { hasDayDrawSlotUsedSync } from './db/dayDrawSlotsRepo.js';
import {
  listDayPushSubscribersSync,
  markDayPushHandledSync,
  setDayPushEnabled,
} from './db/usersRepo.js';
import { moscowCalendarDate, getDayDrawTimezone } from './dayDrawState.js';
import { isAtOrPastLocalHm } from './pushSchedule.js';
import { withTelegramTypingWhile } from './typingIndicator.js';

let tickBusy = false;

function isForbiddenError(e: unknown): boolean {
  if (e === null || typeof e !== 'object') return false;
  const o = e as { response?: { error_code?: number }; code?: number };
  return o.response?.error_code === 403 || o.code === 403;
}

async function runDueDayPushes(bot: Telegraf): Promise<void> {
  const now = new Date();
  const todayKey = moscowCalendarDate(now);
  const subs = listDayPushSubscribersSync();

  for (const s of subs) {
    const uid = s.telegram_user_id;
    if (s.day_push_last_calendar_date === todayKey) continue;
    if (!isAtOrPastLocalHm(now, s.day_push_timezone, s.day_push_local_hhmm)) continue;

    if (hasDayDrawSlotUsedSync(uid, todayKey)) {
      markDayPushHandledSync(uid, todayKey);
      continue;
    }

    try {
      const result = await deliverCardOfDayReading(bot.telegram, uid, 'push', (task) =>
        withTelegramTypingWhile(bot.telegram, uid, task),
      );
      if (result === 'ok') {
        markDayPushHandledSync(uid, todayKey);
      } else if (result === 'slot_race') {
        markDayPushHandledSync(uid, todayKey);
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        setDayPushEnabled(uid, false, s.day_push_timezone);
        console.log(`[day_push] подписка отключена для user ${uid} (403)`);
      } else {
        console.error('[day_push] user', uid, e);
      }
    }
  }
}

export function startDayPushScheduler(bot: Telegraf): void {
  cron.schedule('* * * * *', () => {
    if (tickBusy) return;
    tickBusy = true;
    void runDueDayPushes(bot)
      .catch((e) => console.error('[day_push]', e))
      .finally(() => {
        tickBusy = false;
      });
  });
  console.log(
    `[day_push] Планировщик: раз в минуту; слот календарного дня — по ${getDayDrawTimezone()}.`,
  );
}
