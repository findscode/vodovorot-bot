import type { Context, Telegraf } from 'telegraf';
import { spreadAccessOptsForUser } from '../spreadLabels.js';
import {
  menuTextHtml,
  PUSHTIME_INVALID_FORMAT_HTML,
  PUSHTIME_NEED_SUBSCRIPTION_HTML,
  PUSHTIME_PICK_PROMPT_HTML,
  pushtimeSavedMessageHtml,
  startTextHtml,
} from '../botCopy.js';
import {
  keyboardDayPushTimePresets,
  keyboardMainOrDayOnly,
  keyboardMainOrDayPlusDayPushShortcut,
} from '../botKeyboards.js';
import { getDayDrawTimezone } from '../dayDrawState.js';
import { normalizeDayPushHhmm } from '../dayPushPresets.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import {
  getDayPushScheduleForUserSync,
  getOrCreateUser,
  isDayPushEnabledSync,
  setDayPushLocalHhmmSync,
} from '../db/usersRepo.js';
import { helpTextHtml } from '../statusCopy.js';
import { deliverWhatsNewIfNeeded } from '../releaseNotesDelivery.js';
import { dayPushHhmmArgFromMessageText } from './botHelpers.js';

async function replyHelp(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  getOrCreateUser(uid);
  await ctx.reply(helpTextHtml(uid), {
    ...keyboardMainOrDayOnly(uid),
    ...TELEGRAM_HTML_PARSE,
  });
}

export function registerCommands(bot: Telegraf): void {
  bot.start(async (ctx) => {
    const uid = ctx.from?.id;
    if (uid !== undefined) {
      getOrCreateUser(uid);
      await deliverWhatsNewIfNeeded(ctx, uid);
    }
    const accessOpts = spreadAccessOptsForUser(uid);
    await ctx.reply(startTextHtml(accessOpts), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.command('menu', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid !== undefined) {
      getOrCreateUser(uid);
      await deliverWhatsNewIfNeeded(ctx, uid);
    }
    const accessOpts = spreadAccessOptsForUser(uid);
    await ctx.reply(menuTextHtml(accessOpts), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.command('help', replyHelp);
  bot.command('status', replyHelp);

  bot.command('pushtime', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (!isDayPushEnabledSync(uid)) {
      await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    const text =
      ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string'
        ? ctx.message.text
        : '';
    const arg = dayPushHhmmArgFromMessageText(text);
    if (arg !== undefined) {
      const hhmm = normalizeDayPushHhmm(arg);
      if (!hhmm) {
        await ctx.reply(PUSHTIME_INVALID_FORMAT_HTML, {
          ...keyboardDayPushTimePresets(),
          ...TELEGRAM_HTML_PARSE,
        });
        return;
      }
      if (!setDayPushLocalHhmmSync(uid, hhmm)) {
        await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
          ...keyboardMainOrDayOnly(uid),
          ...TELEGRAM_HTML_PARSE,
        });
        return;
      }
      const row = getDayPushScheduleForUserSync(uid);
      const tz = row?.timezoneIana ?? getDayDrawTimezone();
      const kbAfterPushtime = isDayPushEnabledSync(uid)
        ? keyboardMainOrDayPlusDayPushShortcut(uid)
        : keyboardMainOrDayOnly(uid);
      await ctx.reply(pushtimeSavedMessageHtml(hhmm, tz), {
        ...kbAfterPushtime,
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    await ctx.reply(PUSHTIME_PICK_PROMPT_HTML, {
      ...keyboardDayPushTimePresets(),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
