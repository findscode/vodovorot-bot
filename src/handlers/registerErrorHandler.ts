import type { Telegraf } from 'telegraf';
import { UNHANDLED_BOT_ERROR_HTML } from '../botCopy.js';
import { clearDayInFlight } from '../dayInFlight.js';
import { clearDeepInFlight } from '../deepInFlight.js';
import { clearSpreadInFlight } from '../spreadInFlight.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { logHandlerError } from './botHelpers.js';

/**
 * Необработанная ошибка: снимаем in-flight, но **не** рвём spread/deep-сессию —
 * пользователь может повторить шаг без полного перезапуска из Меню.
 */
export function registerErrorHandler(bot: Telegraf): void {
  bot.catch(async (err, ctx) => {
    logHandlerError('bot', err);
    const uid = ctx.from?.id;
    if (uid !== undefined) {
      clearDeepInFlight(uid);
      clearSpreadInFlight(uid);
      clearDayInFlight(uid);
    }
    try {
      await ctx.reply(UNHANDLED_BOT_ERROR_HTML, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    } catch {
      /* ответ уже отправлен или чат недоступен */
    }
  });
}
