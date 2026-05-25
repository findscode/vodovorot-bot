import type { Context, Telegraf } from 'telegraf';
import { spreadAccessOptsForUser } from '../spreadLabels.js';
import {
  HELP_WEBAPP_POINTER_HTML,
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
  keyboardOpenMenuWebApp,
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
import { webappSettingsUrl } from '../webapp/webappConfig.js';
import { deliverWhatsNewIfNeeded } from '../releaseNotesDelivery.js';
import { dayPushHhmmArgFromMessageText } from './botHelpers.js';

async function replyHelp(ctx: Context, full = false): Promise<void> {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  getOrCreateUser(uid);
  const webappUrl = webappSettingsUrl();
  const text = !full && webappUrl ? HELP_WEBAPP_POINTER_HTML : helpTextHtml(uid);
  await ctx.reply(text, {
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
      ...keyboardOpenMenuWebApp(),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.command('help', (ctx) => {
    const text =
      ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string'
        ? ctx.message.text
        : '';
    const full = /\bfull\b/i.test(text);
    return replyHelp(ctx, full);
  });
  bot.command('status', (ctx) => replyHelp(ctx, true));

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
