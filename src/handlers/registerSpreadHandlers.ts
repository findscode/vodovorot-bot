import type { Telegraf } from 'telegraf';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DEEP_EMPTY_QUESTION_MESSAGE,
  DEEP_QUESTION_TOO_LONG_MESSAGE,
  SPREAD_AI_RETRY_SUFFIX,
  SPREAD_ALREADY_AWAITING_MESSAGE,
  SPREAD_CANCELLED_MESSAGE,
  SPREAD_IN_FLIGHT_MESSAGE,
  SPREAD_INTRO_PRESS_START_MESSAGE,
  spreadLimitMessage,
} from '../botCopy.js';
import { canUseSpread } from '../accessResolve.js';
import {
  keyboardMainOrDayOnly,
  keyboardSpreadAwaitingQuestion,
  keyboardSpreadClarification,
  keyboardSpreadIntro,
} from '../botKeyboards.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { normalizeDeepQuestion } from '../deepReading/deepReadingDelivery.js';
import { hasActiveDeepSession } from '../deepReading/sessionStore.js';
import {
  maybeClarifySpreadQuestion,
  runSpreadReadingForUser,
} from './registerQuestionClarityHandlers.js';
import {
  beginSpreadSession,
  endSpreadSession,
  getSpreadSession,
  hasActiveSpreadSession,
  setSpreadPhase,
} from '../spreadSessionStore.js';
import {
  SPREAD_CALLBACK,
  SPREAD_CANCEL_CALLBACK,
  SPREAD_START_CALLBACK,
} from '../spreadConstants.js';
import { resolveAccessTier } from '../accessTier.js';
import { spreadIntroHtml, spreadIntroReadyHtml } from '../tierDisplay.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';
import { clearSpreadInFlight, isSpreadInFlight, tryMarkSpreadInFlight } from '../spreadInFlight.js';

export function registerSpreadHandlers(bot: Telegraf): void {
  bot.action(SPREAD_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    if (!canUseSpread(uid)) {
      await ctx.reply(spreadLimitMessage(), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    if (hasActiveDeepSession(uid)) {
      return;
    }

    if (isSpreadInFlight(uid)) {
      await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    if (hasActiveSpreadSession(uid)) {
      const session = getSpreadSession(uid)!;
      const keyboard =
        session.phase === 'intro'
          ? keyboardSpreadIntro()
          : session.phase === 'awaiting_clarification'
            ? keyboardSpreadClarification()
            : keyboardSpreadAwaitingQuestion();
      await ctx.reply(SPREAD_ALREADY_AWAITING_MESSAGE, {
        ...keyboard,
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    beginSpreadSession(uid, uid);
    const tier = resolveAccessTier(uid);
    await ctx.reply(spreadIntroHtml(tier), {
      ...keyboardSpreadIntro(),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(SPREAD_START_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const session = getSpreadSession(uid);
    if (!session || session.phase !== 'intro') return;

    if (!canUseSpread(uid)) {
      endSpreadSession(uid);
      await ctx.reply(spreadLimitMessage(), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    setSpreadPhase(uid, 'awaiting_question');
    const tier = resolveAccessTier(uid);
    const readyHtml = spreadIntroReadyHtml(tier);
    const editOpts = {
      ...keyboardSpreadAwaitingQuestion(),
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

  bot.action(SPREAD_CANCEL_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (!hasActiveSpreadSession(uid)) return;
    endSpreadSession(uid);
    await ctx.reply(SPREAD_CANCELLED_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return next();
    const session = getSpreadSession(uid);
    if (!session) return next();
    if (hasActiveDeepSession(uid)) return next();

    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    if (session.phase === 'intro') {
      await ctx.reply(SPREAD_INTRO_PRESS_START_MESSAGE, {
        ...keyboardSpreadIntro(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    if (session.phase === 'awaiting_clarification') {
      await ctx.reply(SPREAD_ALREADY_AWAITING_MESSAGE, {
        ...keyboardSpreadClarification(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    const question = normalizeDeepQuestion(text);
    if (question === null) {
      const raw = text.trim();
      await ctx.reply(
        raw.length === 0 ? DEEP_EMPTY_QUESTION_MESSAGE : DEEP_QUESTION_TOO_LONG_MESSAGE,
        { ...keyboardSpreadAwaitingQuestion(), ...TELEGRAM_HTML_PARSE },
      );
      return;
    }

    if (isSpreadInFlight(uid)) {
      await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, {
        ...keyboardSpreadAwaitingQuestion(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    try {
      const clarity = await maybeClarifySpreadQuestion(ctx, uid, question);
      if (clarity === 'clarify_shown') return;

      if (!tryMarkSpreadInFlight(uid)) {
        await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, {
          ...keyboardSpreadAwaitingQuestion(),
          ...TELEGRAM_HTML_PARSE,
        });
        return;
      }

      try {
        await runSpreadReadingForUser(ctx, uid, question);
      } finally {
        clearSpreadInFlight(uid);
      }
    } catch (e) {
      logHandlerError('spread', e);
      endSpreadSession(uid);
      clearSpreadInFlight(uid);
      await ctx.reply(`${AI_TEXT_UNAVAILABLE_MESSAGE}\n\n${SPREAD_AI_RETRY_SUFFIX}`, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    }
  });
}
