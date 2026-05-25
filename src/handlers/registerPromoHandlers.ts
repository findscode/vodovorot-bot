import type { Context, Telegraf } from 'telegraf';
import { PROMO_HELP_HTML, PROMO_MESSAGES, promoOkMessageHtml } from '../botCopy.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import {
  getActivePremiumUntilSync,
  getOrCreateUser,
  tryRedeemPromoCodeSync,
} from '../db/usersRepo.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import { parsePromoCodeFromUserText, stripInvisibleForPromo } from '../promoInput.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';

function messageText(ctx: Context): string {
  const msg = ctx.message;
  if (!msg || !('text' in msg) || typeof msg.text !== 'string') return '';
  return msg.text;
}

/** Telegram уже распознал /promo — не дублируем в text-хендлере. */
function messageHasPromoBotCommand(ctx: Context): boolean {
  const msg = ctx.message;
  if (!msg || !('entities' in msg) || !('text' in msg) || !msg.entities) return false;
  const text = msg.text;
  return msg.entities.some((e) => {
    if (e.type !== 'bot_command') return false;
    const cmd = text.slice(e.offset, e.offset + e.length);
    return /^\/promo(?:@\S+)?$/i.test(cmd);
  });
}

async function replyPromoRedeem(ctx: Context, uid: number, rawCode: string): Promise<void> {
  getOrCreateUser(uid);
  const r = tryRedeemPromoCodeSync(uid, rawCode);
  if (r === 'ok') {
    const until = getActivePremiumUntilSync(uid);
    const msg = until ? promoOkMessageHtml(until) : PROMO_MESSAGES.rejected;
    await ctx.reply(msg, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
    return;
  }
  const msg = r === 'rate_limited' ? PROMO_MESSAGES.rateLimited : PROMO_MESSAGES.rejected;
  await ctx.reply(msg, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
}

export function registerPromoHandlers(bot: Telegraf): void {
  bot.command('promo', async (ctx) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const text = messageText(ctx);
    const parsed = parsePromoCodeFromUserText(stripInvisibleForPromo(text));
    if (!parsed) {
      await ctx.reply(PROMO_MESSAGES.needCode, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    await replyPromoRedeem(ctx, uid, parsed);
  });

  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return next();
    if (hasActiveDeepSession(uid)) return next();

    const text = messageText(ctx);
    if (!text) return next();
    if (messageHasPromoBotCommand(ctx)) return next();

    const code = parsePromoCodeFromUserText(text);
    if (!code) return next();

    await replyPromoRedeem(ctx, uid, code);
  });

  bot.action('promo_help', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    await ctx.reply(PROMO_HELP_HTML, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
  });
}
