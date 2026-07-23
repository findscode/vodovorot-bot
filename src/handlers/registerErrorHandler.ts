import type { Telegraf } from 'telegraf';
import { UNHANDLED_BOT_ERROR_HTML } from '../botCopy.js';
import { isDayInFlight, clearDayInFlight } from '../dayInFlight.js';
import { isDeepInFlight, clearDeepInFlight } from '../deepInFlight.js';
import { isSpreadInFlight, clearSpreadInFlight } from '../spreadInFlight.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { logHandlerError } from './botHelpers.js';

/** Пока идёт выдача расклада, чужой/параллельный сбой не должен спамить и снимать lock. */
export function shouldSuppressUnhandledDuringReading(userId: number | undefined): boolean {
  if (userId === undefined) return false;
  return isDeepInFlight(userId) || isSpreadInFlight(userId) || isDayInFlight(userId);
}

/**
 * Необработанная ошибка: снимаем in-flight, но **не** рвём spread/deep-сессию.
 * Если расклад уже в полёте — только лог: иначе пользователь получит
 * «Что-то пошло не так» поверх ещё идущего ИИ и второй ответ об ошибке.
 */
export function registerErrorHandler(bot: Telegraf): void {
  bot.catch(async (err, ctx) => {
    const uid = ctx.from?.id;
    if (shouldSuppressUnhandledDuringReading(uid)) {
      logHandlerError('bot_suppressed_during_reading', err);
      return;
    }
    logHandlerError('bot', err);
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
