import type { Telegraf } from 'telegraf';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DEEP_CANCELLED_MESSAGE,
  DEEP_EMPTY_QUESTION_MESSAGE,
  DEEP_FINAL_RETRY_MESSAGE,
  DEEP_IN_FLIGHT_MESSAGE,
  DEEP_INTRO_PRESS_START_MESSAGE,
  DEEP_QUESTION_TOO_LONG_MESSAGE,
  SPREAD_ALREADY_AWAITING_MESSAGE,
} from '../botCopy.js';
import {
  keyboardDeepAwaitingFirst,
  keyboardDeepClarification,
  keyboardDeepIntro,
  keyboardDeepInChain,
  keyboardMainOrDayOnly,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import {
  deliverDeepTriplet,
  normalizeDeepQuestion,
  runDeepFinal,
  sessionReadyForQuestion,
} from '../deepReading/deepReadingDelivery.js';
import { launchDeepIntro } from '../readingLaunch.js';
import { readingContextFromTelegraf } from '../readingLaunchContext.js';
import { maybeClarifyDeepFirstQuestion } from './registerQuestionClarityHandlers.js';
import {
  DEEP_CALLBACK,
  DEEP_CANCEL_CALLBACK,
  DEEP_END_CALLBACK,
  DEEP_START_CALLBACK,
} from '../deepReading/constants.js';
import { endDeepSession, getDeepSession, setDeepPhase } from '../deepReading/sessionStore.js';
import { clearDeepInFlight, tryMarkDeepInFlight } from '../deepInFlight.js';
import { resolveAccessTier } from '../accessTier.js';
import { deepIntroReadyHtml } from '../tierDisplay.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';

export function registerDeepReadingHandlers(bot: Telegraf): void {
  bot.action(DEEP_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const launchCtx = readingContextFromTelegraf(ctx);
    if (!launchCtx) return;
    await launchDeepIntro(launchCtx, uid);
  });

  bot.action(DEEP_START_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getDeepSession(uid);
    if (!session || session.phase !== 'intro') return;

    setDeepPhase(uid, 'awaiting_first_question');
    const tier = resolveAccessTier(uid);
    const readyHtml = deepIntroReadyHtml(tier);
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
          readyHtml,
          editOpts,
        );
        return;
      } catch {
        /* старое сообщение — fallback reply */
      }
    }
    await ctx.reply(readyHtml, editOpts);
  });

  bot.action(DEEP_CANCEL_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getDeepSession(uid);
    if (!session) return;
    if (session.triplets.length > 0) return;
    endDeepSession(uid);
    clearDeepInFlight(uid);
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
    if (session.phase !== 'in_chain' && session.phase !== 'awaiting_final_retry') return;
    if (!tryMarkDeepInFlight(uid)) {
      await ctx.reply(DEEP_IN_FLIGHT_MESSAGE, {
        ...keyboardDeepInChain(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    try {
      await runDeepFinal(ctx, uid);
    } finally {
      clearDeepInFlight(uid);
    }
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

    if (session.phase === 'awaiting_clarification') {
      await ctx.reply(SPREAD_ALREADY_AWAITING_MESSAGE, {
        ...keyboardDeepClarification(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    if (session.phase === 'awaiting_final_retry') {
      await ctx.reply(DEEP_FINAL_RETRY_MESSAGE, {
        ...keyboardDeepInChain(),
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

    if (!tryMarkDeepInFlight(uid)) {
      await ctx.reply(DEEP_IN_FLIGHT_MESSAGE, {
        ...keyboardDeepInChain(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    try {
      const clarity = await maybeClarifyDeepFirstQuestion(ctx, uid, question);
      if (clarity === 'clarify_shown') return;

      const result = await deliverDeepTriplet(ctx, uid, question);
      if (result === 'deck_empty') {
        logHandlerError('deep_deck', new Error('deck exhausted'));
        await runDeepFinal(ctx, uid);
      }
    } catch (e) {
      logHandlerError('deep_text', e);
      await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE, {
        ...keyboardDeepInChain(),
        ...TELEGRAM_HTML_PARSE,
      });
    } finally {
      clearDeepInFlight(uid);
    }
  });
}
