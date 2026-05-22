import type { Telegraf } from 'telegraf';
import {
  DEEP_ALREADY_ACTIVE_MESSAGE,
  DEEP_CANCELLED_MESSAGE,
  DEEP_EMPTY_QUESTION_MESSAGE,
  DEEP_INTRO_HTML,
  DEEP_INTRO_PRESS_START_MESSAGE,
  DEEP_INTRO_READY_HTML,
  DEEP_QUESTION_TOO_LONG_MESSAGE,
} from '../botCopy.js';
import {
  keyboardDeepAwaitingFirst,
  keyboardDeepIntro,
  keyboardDeepInChain,
  keyboardMainOrDayOnly,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import {
  beginDeepSession,
  deliverDeepTriplet,
  normalizeDeepQuestion,
  runDeepFinal,
  sessionReadyForQuestion,
} from '../deepReading/deepReadingDelivery.js';
import {
  DEEP_CALLBACK,
  DEEP_CANCEL_CALLBACK,
  DEEP_END_CALLBACK,
  DEEP_START_CALLBACK,
} from '../deepReading/constants.js';
import {
  endDeepSession,
  getDeepSession,
  hasActiveDeepSession,
  setDeepPhase,
} from '../deepReading/sessionStore.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';

export function registerDeepReadingHandlers(bot: Telegraf): void {
  bot.action(DEEP_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (hasActiveDeepSession(uid)) {
      await ctx.reply(DEEP_ALREADY_ACTIVE_MESSAGE, {
        ...keyboardDeepInChain(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    beginDeepSession(uid, uid);
    await ctx.reply(DEEP_INTRO_HTML, {
      ...keyboardDeepIntro(),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(DEEP_START_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getDeepSession(uid);
    if (!session || session.phase !== 'intro') return;

    setDeepPhase(uid, 'awaiting_first_question');
    const editOpts = {
      ...keyboardDeepAwaitingFirst(),
      ...TELEGRAM_HTML_PARSE,
    };
    const msg = ctx.callbackQuery?.message;
    if (msg && 'message_id' in msg) {
      try {
        await ctx.telegram.editMessageText(
          msg.chat.id,
          msg.message_id,
          undefined,
          DEEP_INTRO_READY_HTML,
          editOpts,
        );
        return;
      } catch {
        /* старое сообщение — fallback reply */
      }
    }
    await ctx.reply(DEEP_INTRO_READY_HTML, editOpts);
  });

  bot.action(DEEP_CANCEL_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getDeepSession(uid);
    if (!session) return;
    if (session.triplets.length > 0) return;
    endDeepSession(uid);
    await ctx.reply(DEEP_CANCELLED_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(DEEP_END_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getDeepSession(uid);
    if (!session || session.triplets.length === 0) return;
    await runDeepFinal(ctx, uid);
  });

  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return next();
    const session = getDeepSession(uid);
    if (!session) return next();

    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    if (session.phase === 'intro') {
      await ctx.reply(DEEP_INTRO_PRESS_START_MESSAGE, {
        ...keyboardDeepIntro(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    if (!sessionReadyForQuestion(session)) return next();

    const question = normalizeDeepQuestion(text);
    if (question === null) {
      const raw = text.trim();
      await ctx.reply(
        raw.length === 0 ? DEEP_EMPTY_QUESTION_MESSAGE : DEEP_QUESTION_TOO_LONG_MESSAGE,
        { ...keyboardDeepInChain(), ...TELEGRAM_HTML_PARSE },
      );
      return;
    }

    try {
      const result = await deliverDeepTriplet(ctx, uid, question);
      if (result === 'deck_empty') {
        logHandlerError('deep_deck', new Error('deck exhausted'));
        await runDeepFinal(ctx, uid);
      }
    } catch (e) {
      logHandlerError('deep_text', e);
    }
  });
}
