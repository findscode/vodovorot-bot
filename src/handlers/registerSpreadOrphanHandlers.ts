import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import { normalizeDeepQuestion } from '../deepReading/deepReadingDelivery.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { spreadSessionLostMessageHtml } from '../sessionRecoveryCopy.js';
import { spreadTitleLineHtml } from '../spreadLabels.js';
import { consumeSpreadOrphanHint, hasActiveSpreadSession } from '../spreadSessionStore.js';

/** Текст вопроса без активной spread-сессии после TTL (#56). */
export function registerSpreadOrphanHandlers(bot: Telegraf): void {
  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return next();

    if (hasActiveSpreadSession(uid) || hasActiveDeepSession(uid)) return next();

    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    if (!consumeSpreadOrphanHint(uid)) return next();

    const question = normalizeDeepQuestion(text);
    if (question === null) return next();

    const tier = resolveAccessTier(uid);
    await ctx.reply(spreadSessionLostMessageHtml(spreadTitleLineHtml(tier, 'spread')), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
