import type { Context } from 'telegraf';
import type { Telegraf } from 'telegraf';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  QUESTION_CLARITY_REFINE_MESSAGE,
  SPREAD_AI_RETRY_SUFFIX,
  SPREAD_IN_FLIGHT_MESSAGE,
  questionClarityMessageHtml,
  spreadLimitMessage,
} from '../botCopy.js';
import {
  keyboardDeepAwaitingFirst,
  keyboardDeepClarification,
  keyboardMainOrDayOnly,
  keyboardSpreadAwaitingQuestion,
  keyboardSpreadClarification,
} from '../botKeyboards.js';
import { deliverDeepTriplet } from '../deepReading/deepReadingDelivery.js';
import {
  getDeepSession,
  setDeepClarityQuestion,
  setDeepClaritySkipNext,
  setDeepPhase,
} from '../deepReading/sessionStore.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { evaluateQuestionClarity } from '../questionClarity.js';
import { CLARITY_KEEP_CALLBACK, CLARITY_REFINE_CALLBACK } from '../questionClarityConstants.js';
import { deliverSpreadReading } from '../spreadDelivery.js';
import {
  getSpreadSession,
  setSpreadClarityQuestion,
  setSpreadClaritySkipNext,
  setSpreadPhase,
} from '../spreadSessionStore.js';
import { resolveAccessTier } from '../accessTier.js';
import { withTypingWhile } from '../typingIndicator.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';
import { endSpreadSession } from '../spreadSessionStore.js';
import { clearSpreadInFlight, tryMarkSpreadInFlight } from '../spreadInFlight.js';

export async function runSpreadReadingForUser(
  ctx: Context,
  uid: number,
  question: string,
): Promise<void> {
  const tier = resolveAccessTier(uid);
  const result = await deliverSpreadReading(ctx.telegram, uid, uid, question, tier, (task) =>
    withTypingWhile(ctx, task),
  );
  if (result === 'ai_error' || result === 'delivery_error') {
    await ctx.reply(`${AI_TEXT_UNAVAILABLE_MESSAGE}\n\n${SPREAD_AI_RETRY_SUFFIX}`, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  } else if (result === 'limit_reached') {
    await ctx.reply(spreadLimitMessage(), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  }
}

export async function maybeClarifySpreadQuestion(
  ctx: Context,
  uid: number,
  question: string,
): Promise<'clarify_shown' | 'proceed'> {
  const session = getSpreadSession(uid);
  if (!session) return 'proceed';
  if (session.claritySkipNext) {
    setSpreadClaritySkipNext(uid, false);
    return 'proceed';
  }
  const clarity = await withTypingWhile(ctx, () => evaluateQuestionClarity(question));
  if (clarity.action === 'clarify') {
    setSpreadClarityQuestion(uid, question);
    setSpreadPhase(uid, 'awaiting_clarification');
    await ctx.reply(questionClarityMessageHtml(clarity.hint), {
      ...keyboardSpreadClarification(),
      ...TELEGRAM_HTML_PARSE,
    });
    return 'clarify_shown';
  }
  return 'proceed';
}

export async function maybeClarifyDeepFirstQuestion(
  ctx: Context,
  uid: number,
  question: string,
): Promise<'clarify_shown' | 'proceed'> {
  const session = getDeepSession(uid);
  if (!session || session.triplets.length > 0 || session.phase !== 'awaiting_first_question') {
    return 'proceed';
  }
  if (session.claritySkipNext) {
    setDeepClaritySkipNext(uid, false);
    return 'proceed';
  }
  const clarity = await withTypingWhile(ctx, () => evaluateQuestionClarity(question));
  if (clarity.action === 'clarify') {
    setDeepClarityQuestion(uid, question);
    setDeepPhase(uid, 'awaiting_clarification');
    await ctx.reply(questionClarityMessageHtml(clarity.hint), {
      ...keyboardDeepClarification(),
      ...TELEGRAM_HTML_PARSE,
    });
    return 'clarify_shown';
  }
  return 'proceed';
}

export function registerQuestionClarityHandlers(bot: Telegraf): void {
  bot.action(CLARITY_REFINE_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const spread = getSpreadSession(uid);
    if (spread?.phase === 'awaiting_clarification') {
      setSpreadPhase(uid, 'awaiting_question');
      setSpreadClarityQuestion(uid, null);
      setSpreadClaritySkipNext(uid, true);
      await ctx.reply(QUESTION_CLARITY_REFINE_MESSAGE, {
        ...keyboardSpreadAwaitingQuestion(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }

    const deep = getDeepSession(uid);
    if (deep?.phase === 'awaiting_clarification') {
      setDeepPhase(uid, 'awaiting_first_question');
      setDeepClarityQuestion(uid, null);
      setDeepClaritySkipNext(uid, true);
      await ctx.reply(QUESTION_CLARITY_REFINE_MESSAGE, {
        ...keyboardDeepAwaitingFirst(),
        ...TELEGRAM_HTML_PARSE,
      });
    }
  });

  bot.action(CLARITY_KEEP_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const spread = getSpreadSession(uid);
    if (spread?.phase === 'awaiting_clarification' && spread.clarityQuestion) {
      const question = spread.clarityQuestion;
      if (!tryMarkSpreadInFlight(uid)) {
        await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, {
          ...keyboardSpreadClarification(),
          ...TELEGRAM_HTML_PARSE,
        });
        return;
      }
      setSpreadClarityQuestion(uid, null);
      setSpreadPhase(uid, 'awaiting_question');
      try {
        await runSpreadReadingForUser(ctx, uid, question);
      } catch (e) {
        logHandlerError('spread_clarity_keep', e);
        endSpreadSession(uid);
        await ctx.reply(`${AI_TEXT_UNAVAILABLE_MESSAGE}\n\n${SPREAD_AI_RETRY_SUFFIX}`, {
          ...keyboardMainOrDayOnly(uid),
          ...TELEGRAM_HTML_PARSE,
        });
      } finally {
        clearSpreadInFlight(uid);
      }
      return;
    }

    const deep = getDeepSession(uid);
    if (deep?.phase === 'awaiting_clarification' && deep.clarityQuestion) {
      const question = deep.clarityQuestion;
      setDeepClarityQuestion(uid, null);
      setDeepPhase(uid, 'awaiting_first_question');
      try {
        await deliverDeepTriplet(ctx, uid, question);
      } catch (e) {
        logHandlerError('deep_clarity_keep', e);
      }
    }
  });
}
