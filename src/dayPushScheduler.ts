import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { deliverCardOfDayReading } from './cardOfDayDelivery.js';
import { hasDayDrawSlotUsedSync } from './db/dayDrawSlotsRepo.js';
import {
  listDayPushSubscribersSync,
  markDayPushClosedForTodaySync,
  setDayPushEnabled,
  type DayPushSubscriberRow,
} from './db/usersRepo.js';
import { applyDayPushDeliveryResult } from './dayPushApplyResult.js';
import { clearPushFailuresForDay } from './dayPushRetry.js';
import { isDayPushDeliveryEnabled } from './dayPushConfig.js';
import { dayDrawCalendarDate, getDayDrawTimezone } from './dayDrawState.js';
import { decideDayPushTick, type DayPushTickDecision } from './dayPushTickLogic.js';
import { isAtOrPastLocalHm } from './pushSchedule.js';
import { withTelegramTypingWhile } from './typingIndicator.js';

let tickBusy = false;

const configWarned = new Set<string>();

function isForbiddenError(e: unknown): boolean {
  if (e === null || typeof e !== 'object') return false;
  const o = e as { response?: { error_code?: number }; code?: number };
  return o.response?.error_code === 403 || o.code === 403;
}

function warnConfigOnce(userId: number, reason: string): void {
  const k = `${userId}:${reason}`;
  if (configWarned.has(k)) return;
  configWarned.add(k);
  console.error(
    `[day_push] user ${userId}: некорректная подписка (${reason}), рассылка отключена логически`,
  );
}

type SubscriberWork = {
  sub: DayPushSubscriberRow;
  decision: DayPushTickDecision;
};

async function processSubscriber(
  bot: Telegraf,
  work: SubscriberWork,
  todayKey: string,
  now: Date,
): Promise<void> {
  const s = work.sub;
  const uid = s.telegram_user_id;
  const decision = work.decision;

  if (decision.action === 'skip') {
    if (decision.reason === 'invalid_local_hhmm' || decision.reason === 'invalid_timezone') {
      warnConfigOnce(uid, decision.reason);
    }
    return;
  }

  if (decision.action === 'skip_slot_already_used') {
    markDayPushClosedForTodaySync(uid, todayKey);
    clearPushFailuresForDay(uid, todayKey);
    console.log(
      `[day_push] user ${uid}: слот ${todayKey} занят (ручная «на день»), рассылка закрыта без сообщения в чат`,
    );
    return;
  }

  try {
    console.log(
      `[day_push] user ${uid}: отправка (${todayKey}, ${s.day_push_local_hhmm} ${s.day_push_timezone})`,
    );
    const result = await deliverCardOfDayReading(
      bot.telegram,
      uid,
      (task) => withTelegramTypingWhile(bot.telegram, uid, task),
      { at: now },
    );
    await applyDayPushDeliveryResult({ bot, userId: uid, todayKey, result });
  } catch (e) {
    if (isForbiddenError(e)) {
      setDayPushEnabled(uid, false, s.day_push_timezone);
      clearPushFailuresForDay(uid, todayKey);
      console.log(`[day_push] подписка отключена для user ${uid} (403)`);
    } else {
      console.error('[day_push] user', uid, e);
    }
  }
}

async function runDueDayPushes(bot: Telegraf): Promise<void> {
  const now = new Date();
  const todayKey = dayDrawCalendarDate(now);
  const subs = listDayPushSubscribersSync();
  if (subs.length === 0) return;

  const work: SubscriberWork[] = [];
  let due = 0;

  for (const sub of subs) {
    const slotUsedToday = hasDayDrawSlotUsedSync(sub.telegram_user_id, todayKey);
    const decision = decideDayPushTick(sub, {
      todayKey,
      slotUsedToday,
      isAtOrPastLocalHm,
      now,
    });
    work.push({ sub, decision });
    if (decision.action === 'deliver') {
      due += 1;
    }
  }

  if (due > 0) {
    console.log(`[day_push] тик ${todayKey}: подписчиков=${subs.length}, к отправке=${due}`);
  }

  for (const w of work) {
    await processSubscriber(bot, w, todayKey, now);
  }
}

function scheduleTick(bot: Telegraf): void {
  if (tickBusy) {
    console.warn('[day_push] предыдущий тик ещё выполняется, пропуск минуты');
    return;
  }
  tickBusy = true;
  void runDueDayPushes(bot)
    .catch((e) => console.error('[day_push]', e))
    .finally(() => {
      tickBusy = false;
    });
}

export function startDayPushScheduler(bot: Telegraf): void {
  if (!isDayPushDeliveryEnabled()) {
    console.log(
      '[day_push] Автоматическая рассылка выключена (DAY_PUSH_ENABLED). Планировщик не запущен; подписки в БД сохранены.',
    );
    return;
  }
  cron.schedule('* * * * *', () => scheduleTick(bot));
  console.log(
    `[day_push] Планировщик: раз в минуту + catch-up при старте; слот суток — ${getDayDrawTimezone()}.`,
  );
  scheduleTick(bot);
}
