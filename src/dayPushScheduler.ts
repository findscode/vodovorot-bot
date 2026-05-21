import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { deliverCardOfDayReading } from './cardOfDayDelivery.js';
import { hasDayDrawSlotUsedSync } from './db/dayDrawSlotsRepo.js';
import {
  listDayPushSubscribersSync,
  markDayPushHandledSync,
  setDayPushEnabled,
} from './db/usersRepo.js';
import { DAY_PUSH_AI_UNAVAILABLE_MESSAGE } from './botCopy.js';
import { clearPushAiFailure, pushAiFailKey, recordPushAiFailure } from './dayPushAiRetry.js';
import { dayDrawCalendarDate, getDayDrawTimezone } from './dayDrawState.js';
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
  const todayKey = dayDrawCalendarDate(now);
  const subs = listDayPushSubscribersSync();

  for (const s of subs) {
    const uid = s.telegram_user_id;
    if (s.day_push_last_calendar_date === todayKey) continue;
    if (!isAtOrPastLocalHm(now, s.day_push_timezone, s.day_push_local_hhmm)) continue;

    if (hasDayDrawSlotUsedSync(uid, todayKey)) {
      markDayPushHandledSync(uid, todayKey);
      clearPushAiFailure(pushAiFailKey(uid, todayKey));
      continue;
    }

    const failKey = pushAiFailKey(uid, todayKey);

    try {
      const result = await deliverCardOfDayReading(
        bot.telegram,
        uid,
        (task) => withTelegramTypingWhile(bot.telegram, uid, task),
        { at: now },
      );
      if (result === 'ok') {
        markDayPushHandledSync(uid, todayKey);
        clearPushAiFailure(failKey);
      } else if (result === 'slot_race') {
        markDayPushHandledSync(uid, todayKey);
        clearPushAiFailure(failKey);
      } else if (result === 'ai_error') {
        const { count, shouldGiveUp } = recordPushAiFailure(failKey);
        if (count === 1) {
          try {
            await bot.telegram.sendMessage(uid, DAY_PUSH_AI_UNAVAILABLE_MESSAGE);
          } catch (sendErr) {
            console.error(
              '[day_push] не удалось отправить сообщение об ошибке ИИ user',
              uid,
              sendErr,
            );
          }
        }
        if (shouldGiveUp) {
          markDayPushHandledSync(uid, todayKey);
          clearPushAiFailure(failKey);
          console.warn(
            `[day_push] user ${uid}: сбой ИИ ${count} раз за ${todayKey}, рассылка отложена до завтра`,
          );
        }
      } else if (result === 'delivery_error') {
        console.error(`[day_push] delivery_error user ${uid} (повтор на следующих тиках)`);
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        setDayPushEnabled(uid, false, s.day_push_timezone);
        clearPushAiFailure(failKey);
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
