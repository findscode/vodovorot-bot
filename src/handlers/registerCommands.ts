import type { Telegraf } from 'telegraf';
import { hasFullSpreadAccess } from '../accessResolve.js';
import {
  helpTextHtml,
  LAST_EMPTY_MESSAGE,
  menuTextFull,
  menuTextLimited,
  PROMO_MESSAGES,
  PUSHTIME_INVALID_FORMAT_HTML,
  PUSHTIME_NEED_SUBSCRIPTION_HTML,
  PUSHTIME_PICK_PROMPT_HTML,
  pushtimeSavedMessageHtml,
  startTextFull,
  startTextLimited,
} from '../botCopy.js';
import {
  keyboardDayPushTimePresets,
  keyboardMainOrDayOnly,
  keyboardMainOrDayPlusDayPushShortcut,
} from '../botKeyboards.js';
import { getDayDrawTimezone } from '../dayDrawState.js';
import { normalizeDayPushHhmm } from '../dayPushPresets.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { getLastReading } from '../lastReadingStore.js';
import {
  getDayPushScheduleForUserSync,
  isDayPushEnabledSync,
  setDayPushLocalHhmmSync,
  tryRedeemPromoCodeSync,
} from '../db/usersRepo.js';
import { splitForTelegram } from '../telegramChunks.js';
import { statusTextHtml } from '../statusCopy.js';
import { dayPushHhmmArgFromMessageText } from './botHelpers.js';

export function registerCommands(bot: Telegraf): void {
  bot.start(async (ctx) => {
    const full = hasFullSpreadAccess(ctx.from?.id);
    const text = full ? startTextFull() : startTextLimited();
    await ctx.reply(text, { ...keyboardMainOrDayOnly(ctx.from?.id), ...TELEGRAM_HTML_PARSE });
  });

  bot.command('menu', async (ctx) => {
    const full = hasFullSpreadAccess(ctx.from?.id);
    const text = full ? menuTextFull() : menuTextLimited();
    await ctx.reply(text, { ...keyboardMainOrDayOnly(ctx.from?.id), ...TELEGRAM_HTML_PARSE });
  });

  bot.command('help', async (ctx) => {
    const full = hasFullSpreadAccess(ctx.from?.id);
    await ctx.reply(helpTextHtml({ fullAccess: full }), {
      ...keyboardMainOrDayOnly(ctx.from?.id),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.command('status', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    await ctx.reply(statusTextHtml(uid), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

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

  bot.command('last', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const text = getLastReading(uid);
    if (!text) {
      await ctx.reply(LAST_EMPTY_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    const parts = splitForTelegram(text);
    for (let i = 0; i < parts.length; i++) {
      await ctx.reply(formatReadingForTelegram(parts[i]), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    }
  });

  bot.command('promo', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const text =
      ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string'
        ? ctx.message.text.trim()
        : '';
    const code = text.split(/\s+/).slice(1).join(' ').trim();
    if (!code) {
      await ctx.reply(PROMO_MESSAGES.needCode, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    const r = tryRedeemPromoCodeSync(uid, code);
    const msg =
      r === 'ok'
        ? PROMO_MESSAGES.ok
        : r === 'used'
          ? PROMO_MESSAGES.used
          : r === 'expired'
            ? PROMO_MESSAGES.expired
            : PROMO_MESSAGES.invalid;
    await ctx.reply(msg, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
  });
}
