import type { Telegraf } from 'telegraf';
import {
  accessDeniedMessage,
  DEEP_ALREADY_ACTIVE_MESSAGE,
  deepSessionBlockedMessageHtml,
  isPublicEntryCommand,
  WHITELIST_NO_SPREAD_ACCESS_CALLBACK,
} from '../botCopy.js';
import { hasFullSpreadAccess } from '../accessResolve.js';
import { getAccessWhitelist } from '../runtimeConfig.js';
import {
  DAY_PUSH_TIME_MENU_CALLBACK,
  keyboardDeepInChain,
  keyboardMainOrDayOnly,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import {
  DEEP_CALLBACK,
  DEEP_CANCEL_CALLBACK,
  DEEP_END_CALLBACK,
  DEEP_START_CALLBACK,
} from '../deepReading/constants.js';

/** Только личные чаты: в группах и каналах не отвечаем и не обрабатываем расклады. */
export function registerPrivateChatMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    const chatType = ctx.chat?.type;
    if (chatType !== undefined && chatType !== 'private') {
      return;
    }
    return next();
  });
}

/** Во время глубинной диагностики блокируем команды и чужие callback. */
export function registerDeepSessionMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined || !hasActiveDeepSession(uid)) {
      return next();
    }

    const blockedHtml = deepSessionBlockedMessageHtml();
    const blockedKeyboard = keyboardDeepInChain();

    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (d === DEEP_START_CALLBACK || d === DEEP_CANCEL_CALLBACK || d === DEEP_END_CALLBACK) {
        return next();
      }
      await answerCbQuerySafe(ctx);
      if (d === DEEP_CALLBACK) {
        await ctx.reply(DEEP_ALREADY_ACTIVE_MESSAGE, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
      } else {
        await ctx.reply(blockedHtml, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
      }
      return;
    }

    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (text.startsWith('/')) {
        await ctx.reply(blockedHtml, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
        return;
      }
    }

    return next();
  });
}

export function registerAccessWhitelistMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    if (getAccessWhitelist() === null) {
      return next();
    }
    const uid = ctx.from?.id;
    if (hasFullSpreadAccess(uid)) {
      return next();
    }
    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (
        d === 'day' ||
        d === 'day_sub_on' ||
        d === 'day_sub_off' ||
        d === DAY_PUSH_TIME_MENU_CALLBACK ||
        d === DEEP_CALLBACK ||
        d === DEEP_START_CALLBACK ||
        d === DEEP_CANCEL_CALLBACK ||
        d === DEEP_END_CALLBACK ||
        /^pt:\d{2}:\d{2}$/.test(d)
      ) {
        return next();
      }
    }
    if (ctx.message && 'text' in ctx.message && isPublicEntryCommand(ctx.message.text)) {
      return next();
    }
    if (uid !== undefined) {
      console.log(`[whitelist] отклонён user id ${uid} (не полный доступ)`);
    } else {
      console.log('[whitelist] отклонено обновление без ctx.from');
    }
    if (ctx.callbackQuery) {
      await answerCbQuerySafe(ctx, WHITELIST_NO_SPREAD_ACCESS_CALLBACK, false);
      return;
    }
    if (ctx.message) {
      await ctx.reply(accessDeniedMessage(), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    }
  });
}
