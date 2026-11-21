import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import { isPublicEntryCommand, spreadSessionBlockedMessageHtml } from '../botCopy.js';
import {
  keyboardSpreadAwaitingQuestion,
  keyboardSpreadClarification,
  keyboardSpreadIntro,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';
import {
  getSpreadSession,
  hasActiveSpreadSession,
  trackSpreadServiceMessage,
} from '../spreadSessionStore.js';
import { SPREAD_CANCEL_CALLBACK, SPREAD_START_CALLBACK } from '../spreadConstants.js';
import { CLARITY_KEEP_CALLBACK, CLARITY_REFINE_CALLBACK } from '../questionClarityConstants.js';
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
      session.phase === 'intro'
        ? keyboardSpreadIntro()
        : session.phase === 'awaiting_clarification'
          ? keyboardSpreadClarification()
          : keyboardSpreadAwaitingQuestion();

    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (
        d === SPREAD_CANCEL_CALLBACK ||
        d === SPREAD_START_CALLBACK ||
        d === CLARITY_REFINE_CALLBACK ||
        d === CLARITY_KEEP_CALLBACK ||
        d === RELEASE_NOTES_OK_CALLBACK
      ) {
        return next();
      }
      await answerCbQuerySafe(ctx);
      const msg = await ctx.reply(blockedHtml, {
        ...blockedKeyboard,
        ...TELEGRAM_HTML_PARSE,
      });
      trackSpreadServiceMessage(uid, msg.message_id);
      return;
    }

    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (text.startsWith('/')) {
        if (isPublicEntryCommand(text)) return next();
        const msg = await ctx.reply(blockedHtml, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
        trackSpreadServiceMessage(uid, msg.message_id);
        return;
      }
    }

    return next();
  });
}
