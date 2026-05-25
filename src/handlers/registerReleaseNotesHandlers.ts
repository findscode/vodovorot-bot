import type { Telegraf } from 'telegraf';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { markWhatsNewSeen, deliverWhatsNewIfNeeded } from '../releaseNotesDelivery.js';
import { RELEASE_NOTES_OK_CALLBACK, WHATS_NEW_TRIGGER_CALLBACKS } from '../releaseNotes.js';
import { answerCbQuerySafe } from './botHelpers.js';

/** Перед главными кнопками меню — «Что нового», если ещё не видели релиз. */
export function registerWhatsNewTriggerMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    const cq = ctx.callbackQuery;
    if (!cq || !('data' in cq)) {
      return next();
    }
    const uid = ctx.from?.id;
    if (uid === undefined || !WHATS_NEW_TRIGGER_CALLBACKS.has(cq.data)) {
      return next();
    }
    await deliverWhatsNewIfNeeded(ctx, uid);
    return next();
  });
}

export function registerReleaseNotesHandlers(bot: Telegraf): void {
  bot.action(RELEASE_NOTES_OK_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    markWhatsNewSeen(uid);
    const msg = ctx.callbackQuery?.message;
    if (msg && 'message_id' in msg) {
      try {
        await ctx.telegram.deleteMessage(msg.chat.id, msg.message_id);
      } catch {
        /* сообщение уже удалено */
      }
    }
    await ctx.reply('Ок.', {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
