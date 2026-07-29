import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import { normalizeDeepQuestion } from '../deepReading/deepReadingDelivery.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import { keyboardOpenMenuWebApp } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import {
  inactiveSessionTextMessageHtml,
  spreadSessionLostMessageHtml,
} from '../sessionRecoveryCopy.js';
import { spreadTitleLineHtml } from '../spreadLabels.js';
import { consumeSpreadOrphanHint, hasActiveSpreadSession } from '../spreadSessionStore.js';

/** Текст вопроса без активной spread/deep-сессии: TTL, рестарт или старая переписка. */
export function registerSpreadOrphanHandlers(bot: Telegraf): void {
  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return next();

    if (hasActiveSpreadSession(uid) || hasActiveDeepSession(uid)) return next();

    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const question = normalizeDeepQuestion(text);
    if (question === null) return next();

    const hadSpreadHint = consumeSpreadOrphanHint(uid);
    const message = hadSpreadHint
      ? spreadSessionLostMessageHtml(spreadTitleLineHtml(resolveAccessTier(uid), 'spread'))
      : inactiveSessionTextMessageHtml();
    await ctx.reply(message, {
      ...keyboardOpenMenuWebApp(),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
