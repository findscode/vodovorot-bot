import type { Telegraf } from 'telegraf';
import { resolveAccessTier } from '../accessTier.js';
import {
  DEEP_ALREADY_ACTIVE_MESSAGE,
  deepSessionBlockedMessageHtml,
  isPublicEntryCommand,
} from '../botCopy.js';
import {
  keyboardDeepAwaitingFirst,
  keyboardDeepClarification,
  keyboardDeepInChain,
  keyboardDeepIntro,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { answerCbQuerySafe } from './botHelpers.js';
import {
  getDeepSession,
  hasActiveDeepSession,
  type DeepSession,
} from '../deepReading/sessionStore.js';
import {
  DEEP_CALLBACK,
  DEEP_CANCEL_CALLBACK,
  DEEP_END_CALLBACK,
  DEEP_START_CALLBACK,
} from '../deepReading/constants.js';
import { CLARITY_KEEP_CALLBACK, CLARITY_REFINE_CALLBACK } from '../questionClarityConstants.js';
import { RELEASE_NOTES_OK_CALLBACK } from '../releaseNotes.js';

function deepBlockedKeyboard(session: DeepSession) {
  if (session.phase === 'intro') return keyboardDeepIntro();
  if (session.phase === 'awaiting_clarification') return keyboardDeepClarification();
  if (session.phase === 'awaiting_first_question') return keyboardDeepAwaitingFirst();
  return keyboardDeepInChain();
}

function deepAllowedCallbacks(session: DeepSession): string[] {
  const base = [DEEP_START_CALLBACK, DEEP_CANCEL_CALLBACK, RELEASE_NOTES_OK_CALLBACK];
  if (session.phase === 'awaiting_clarification') {
    return [...base, CLARITY_REFINE_CALLBACK, CLARITY_KEEP_CALLBACK];
  }
  if (session.phase === 'in_chain' || session.phase === 'awaiting_final_retry') {
    return [...base, DEEP_END_CALLBACK];
  }
  return base;
}

/** Во время глубинной диагностики блокируем команды и чужие callback. */
export function registerDeepSessionMiddleware(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined || !hasActiveDeepSession(uid)) {
      return next();
    }

    const session = getDeepSession(uid)!;
    const blockedHtml = deepSessionBlockedMessageHtml(resolveAccessTier(uid), session.phase);
    const blockedKeyboard = deepBlockedKeyboard(session);
    const allowed = deepAllowedCallbacks(session);

    const cq = ctx.callbackQuery;
    if (cq && 'data' in cq) {
      const d = cq.data;
      if (allowed.includes(d)) {
        return next();
      }
      await answerCbQuerySafe(ctx);
      if (d === DEEP_CALLBACK) {
        await ctx.reply(DEEP_ALREADY_ACTIVE_MESSAGE, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
      } else {
        await ctx.reply(blockedHtml, {
          ...blockedKeyboard,
          ...TELEGRAM_HTML_PARSE,
        });
      }
      return;
    }

    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (text.startsWith('/')) {
        if (isPublicEntryCommand(text)) return next();
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
