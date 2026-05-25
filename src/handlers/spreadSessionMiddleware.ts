import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import { spreadSessionBlockedMessageHtml } from '../botCopy.js';
import { keyboardSpreadAwaitingQuestion, keyboardSpreadIntro } from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';
import { getSpreadSession, hasActiveSpreadSession } from '../spreadSessionStore.js';
import { SPREAD_CANCEL_CALLBACK, SPREAD_START_CALLBACK } from '../spreadConstants.js';
import { RELEASE_NOTES_OK_CALLBACK } from '../releaseNotes.js';

/** Во время сессии «три карты» блокируем команды и чужие callback. */
export function registerSpreadSessionMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined || !hasActiveSpreadSession(uid)) {
      return next();
    }

    const session = getSpreadSession(uid)!;
    const blockedHtml = spreadSessionBlockedMessageHtml(resolveAccessTier(uid), session.phase);
    const blockedKeyboard =
      session.phase === 'intro' ? keyboardSpreadIntro() : keyboardSpreadAwaitingQuestion();

    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (
        d === SPREAD_CANCEL_CALLBACK ||
        d === SPREAD_START_CALLBACK ||
        d === RELEASE_NOTES_OK_CALLBACK
      ) {
        return next();
      }
      await answerCbQuerySafe(ctx);
      await ctx.reply(blockedHtml, {
        ...blockedKeyboard,
        ...TELEGRAM_HTML_PARSE,
      });
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
