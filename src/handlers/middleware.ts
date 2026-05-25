import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import { DEEP_ALREADY_ACTIVE_MESSAGE, deepSessionBlockedMessageHtml } from '../botCopy.js';
import { keyboardDeepInChain } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import {
  DEEP_CALLBACK,
  DEEP_CANCEL_CALLBACK,
  DEEP_END_CALLBACK,
  DEEP_START_CALLBACK,
} from '../deepReading/constants.js';
import { RELEASE_NOTES_OK_CALLBACK } from '../releaseNotes.js';

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

    const blockedHtml = deepSessionBlockedMessageHtml(resolveAccessTier(uid));
    const blockedKeyboard = keyboardDeepInChain();

    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (
        d === DEEP_START_CALLBACK ||
        d === DEEP_CANCEL_CALLBACK ||
        d === DEEP_END_CALLBACK ||
        d === RELEASE_NOTES_OK_CALLBACK
      ) {
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
