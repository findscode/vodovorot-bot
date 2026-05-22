import type { Telegraf } from 'telegraf';
import type { CardOfDayDeliveryResult } from './cardOfDayDelivery.js';
import { CARD_DAY_DELIVERY_ERROR_MESSAGE, DAY_PUSH_AI_UNAVAILABLE_MESSAGE } from './botCopy.js';
import { markDayPushSentSync } from './db/usersRepo.js';
import {
  clearPushFailuresForDay,
  clearPushFailure,
  pushFailureKey,
  recordPushFailure,
} from './dayPushRetry.js';

export type ApplyDayPushResultParams = {
  bot: Telegraf;
  userId: number;
  todayKey: string;
  result: CardOfDayDeliveryResult;
};

export async function applyDayPushDeliveryResult(params: ApplyDayPushResultParams): Promise<void> {
  const { bot, userId, todayKey, result } = params;
  const aiKey = pushFailureKey(userId, todayKey, 'ai');
  const deliveryKey = pushFailureKey(userId, todayKey, 'delivery');

  if (result === 'ok') {
    markDayPushSentSync(userId, todayKey);
    clearPushFailuresForDay(userId, todayKey);
    console.log(`[day_push] user ${userId}: доставлено ok`);
    return;
  }

  if (result === 'slot_race') {
    clearPushFailuresForDay(userId, todayKey);
    console.log(`[day_push] user ${userId}: slot_race (слот занят, повтор не нужен)`);
    return;
  }

  if (result === 'ai_error') {
    const { count, shouldGiveUp } = recordPushFailure(aiKey);
    if (count === 1) {
      try {
        await bot.telegram.sendMessage(userId, DAY_PUSH_AI_UNAVAILABLE_MESSAGE);
      } catch (sendErr) {
        console.error(
          '[day_push] не удалось отправить сообщение об ошибке ИИ user',
          userId,
          sendErr,
        );
      }
    }
    if (shouldGiveUp) {
      clearPushFailure(aiKey);
      console.warn(
        `[day_push] user ${userId}: сбой ИИ ${count} раз за ${todayKey}, пауза до завтра (слот не занят)`,
      );
    } else {
      console.warn(`[day_push] user ${userId}: ai_error, попытка ${count}/3`);
    }
    return;
  }

  const { count, shouldGiveUp } = recordPushFailure(deliveryKey);
  if (count === 1) {
    try {
      await bot.telegram.sendMessage(userId, CARD_DAY_DELIVERY_ERROR_MESSAGE);
    } catch (sendErr) {
      console.error('[day_push] не удалось отправить delivery_error user', userId, sendErr);
    }
  }
  if (shouldGiveUp) {
    clearPushFailure(deliveryKey);
    console.warn(
      `[day_push] user ${userId}: delivery_error ${count} раз за ${todayKey}, пауза до завтра`,
    );
  } else {
    console.warn(`[day_push] user ${userId}: delivery_error, попытка ${count}/3`);
  }
}
