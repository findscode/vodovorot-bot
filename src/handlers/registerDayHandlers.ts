import type { Telegraf } from 'telegraf';
import {
  AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE,
  DAY_DEBOUNCE_MESSAGE,
  DAY_IN_FLIGHT_MESSAGE,
  dayLimitMessage,
} from '../botCopy.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { dayDrawCalendarDate, hasDayDrawSlotUsed } from '../dayDrawState.js';
import { deliverCardOfDayReading } from '../cardOfDayDelivery.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { withTypingWhile } from '../typingIndicator.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';

const DAY_ACTION_DEBOUNCE_MS = 2500;
const dayLastTap = new Map<number, number>();
const dayInFlight = new Set<number>();

export function registerDayHandlers(bot: Telegraf): void {
  bot.action('day', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    if (dayInFlight.has(uid)) {
      await ctx.reply(DAY_IN_FLIGHT_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    const now = Date.now();
    const prevTap = dayLastTap.get(uid) ?? 0;
    if (now - prevTap < DAY_ACTION_DEBOUNCE_MS) {
      await ctx.reply(DAY_DEBOUNCE_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    dayLastTap.set(uid, now);

    const today = dayDrawCalendarDate();
    if (await hasDayDrawSlotUsed(uid, today)) {
      await ctx.reply(dayLimitMessage(), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    dayInFlight.add(uid);

    try {
      const result = await deliverCardOfDayReading(ctx.telegram, uid, 'manual', (task) =>
        withTypingWhile(ctx, task),
      );
      if (result === 'ai_error') {
        await ctx.reply(AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE, {
          ...keyboardMainOrDayOnly(uid),
          ...TELEGRAM_HTML_PARSE,
        });
      } else if (result === 'slot_race') {
        await ctx.reply(dayLimitMessage(), {
          ...keyboardMainOrDayOnly(uid),
          ...TELEGRAM_HTML_PARSE,
        });
      }
    } catch (e) {
      logHandlerError('day', e);
      await ctx.reply(AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    } finally {
      dayInFlight.delete(uid);
    }
  });
}
