import type { Telegraf } from 'telegraf';
import {
  PUSHTIME_NEED_SUBSCRIPTION_HTML,
  PUSHTIME_PICK_PROMPT_HTML,
  pushtimeSavedMessageHtml,
  SUBSCRIBE_MESSAGES,
  subscribeEnabledMessageHtml,
} from '../botCopy.js';
import {
  DAY_PUSH_TIME_MENU_CALLBACK,
  keyboardDayPushTimePresets,
  keyboardMainOrDayOnly,
  keyboardMainOrDayPlusDayPushShortcut,
} from '../botKeyboards.js';
import { getDayDrawTimezone } from '../dayDrawState.js';
import { getDefaultDayPushHhmm, isDayPushDeliveryEnabled } from '../dayPushConfig.js';
import { isAllowedDayPushHhmm } from '../dayPushPresets.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import {
  getDayPushScheduleForUserSync,
  isDayPushEnabledSync,
  setDayPushEnabled,
  setDayPushLocalHhmmSync,
} from '../db/usersRepo.js';
import { answerCbQuerySafe } from './botHelpers.js';

export function registerDayPushHandlers(bot: Telegraf): void {
  bot.action('day_sub_on', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (!isDayPushDeliveryEnabled()) {
      await ctx.reply(SUBSCRIBE_MESSAGES.paused, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    const tz = getDayDrawTimezone();
    const hhmm = getDefaultDayPushHhmm();
    setDayPushEnabled(uid, true, tz, hhmm);
    await ctx.reply(subscribeEnabledMessageHtml(hhmm, tz), {
      ...keyboardMainOrDayPlusDayPushShortcut(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(DAY_PUSH_TIME_MENU_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (!isDayPushEnabledSync(uid)) {
      await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    await ctx.reply(PUSHTIME_PICK_PROMPT_HTML, {
      ...keyboardDayPushTimePresets(),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(/^pt:(\d{2}:\d{2})$/, async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const hhmm = ctx.match?.[1];
    if (!hhmm || !isAllowedDayPushHhmm(hhmm)) {
      await answerCbQuerySafe(ctx, 'Это время недоступно.', true);
      return;
    }
    const ok = setDayPushLocalHhmmSync(uid, hhmm);
    if (!ok) {
      await answerCbQuerySafe(ctx, 'Сначала включи рассылку.', true);
      return;
    }
    await answerCbQuerySafe(ctx);
    const row = getDayPushScheduleForUserSync(uid);
    const tz = row?.timezoneIana ?? getDayDrawTimezone();
    const kb = isDayPushEnabledSync(uid)
      ? keyboardMainOrDayPlusDayPushShortcut(uid)
      : keyboardMainOrDayOnly(uid);
    await ctx.reply(pushtimeSavedMessageHtml(hhmm, tz), { ...kb, ...TELEGRAM_HTML_PARSE });
  });

  bot.action('day_sub_off', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    setDayPushEnabled(uid, false, getDayDrawTimezone());
    await ctx.reply(SUBSCRIBE_MESSAGES.off, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
