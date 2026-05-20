import type { Telegraf } from 'telegraf';
import { UNHANDLED_BOT_ERROR_HTML } from '../botCopy.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { logHandlerError } from './botHelpers.js';

export function registerErrorHandler(bot: Telegraf): void {
  bot.catch(async (err, ctx) => {
    logHandlerError('bot', err);
    try {
      await ctx.reply(UNHANDLED_BOT_ERROR_HTML, {
        ...keyboardMainOrDayOnly(ctx.from?.id),
        ...TELEGRAM_HTML_PARSE,
      });
    } catch {
      /* ответ уже отправлен или чат недоступен */
    }
  });
}
