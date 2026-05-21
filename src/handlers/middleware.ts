import type { Telegraf } from 'telegraf';
import {
  accessDeniedMessage,
  isPublicEntryCommand,
  WHITELIST_NO_SPREAD_ACCESS_CALLBACK,
} from '../botCopy.js';
import { hasFullSpreadAccess } from '../accessResolve.js';
import { getAccessWhitelist } from '../runtimeConfig.js';
import { DAY_PUSH_TIME_MENU_CALLBACK, keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';

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
