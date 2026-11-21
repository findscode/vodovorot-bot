import { deliverDeepTriplet, runDeepFinal } from '../deepReading/deepReadingDelivery.js';
import {
  flushDeepServiceMessages,
  getDeepSession,
  setDeepClarityQuestion,
  setDeepClaritySkipNext,
  setDeepPhase,
  trackDeepServiceMessage,
} from '../deepReading/sessionStore.js';
import { clearDeepInFlight, tryMarkDeepInFlight } from '../deepInFlight.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { evaluateQuestionClarity } from '../questionClarity.js';
import { CLARITY_KEEP_CALLBACK, CLARITY_REFINE_CALLBACK } from '../questionClarityConstants.js';
import { deliverSpreadReading } from '../spreadDelivery.js';
import {
  endSpreadSession,
  flushSpreadServiceMessages,
  getSpreadSession,
  setSpreadClarityQuestion,
  setSpreadClaritySkipNext,
  setSpreadPhase,
  trackSpreadServiceMessage,
} from '../spreadSessionStore.js';
import { resolveAccessTier } from '../accessTier.js';
import { opsDeliveryError, opsEvent } from '../opsLog.js';
import { withReadingProgress, withTypingWhile } from '../typingIndicator.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';
import { clearSpreadInFlight, tryMarkSpreadInFlight } from '../spreadInFlight.js';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DEEP_IN_FLIGHT_MESSAGE,
  DEEP_STEP_FAILED_MESSAGE,
  QUESTION_CLARITY_REFINE_MESSAGE,
  SPREAD_AI_RETRY_MESSAGE,
  SPREAD_DELIVERY_RETRY_MESSAGE,
  SPREAD_IN_FLIGHT_MESSAGE,
  questionClarityMessageHtml,
  spreadLimitMessage,
} from '../botCopy.js';
import {
  keyboardDeepAwaitingFirst,
  keyboardDeepClarification,
  keyboardDeepInChain,
  keyboardMainOrDayOnly,
  keyboardOpenMenuWebApp,
  keyboardSpreadAwaitingQuestion,
  keyboardSpreadClarification,
} from '../botKeyboards.js';
import type { Context } from 'telegraf';
import type { Telegraf } from 'telegraf';
import { staleSessionButtonMessageHtml } from '../sessionRecoveryCopy.js';

export async function runSpreadReadingForUser(
  ctx: Context,
  uid: number,
  question: string,
): Promise<void> {
  await flushSpreadServiceMessages(ctx.telegram, uid);
  const tier = resolveAccessTier(uid);
  const result = await deliverSpreadReading(ctx.telegram, uid, uid, question, tier, (mode, task) =>
    withReadingProgress(ctx, mode, task),
  );
  try {
    if (result === 'ai_error') {
      const msg = await ctx.reply(`${AI_TEXT_UNAVAILABLE_MESSAGE}\n\n${SPREAD_AI_RETRY_MESSAGE}`, {
        ...keyboardSpreadAwaitingQuestion(),
        ...TELEGRAM_HTML_PARSE,
      });
      trackSpreadServiceMessage(uid, msg.message_id);
    } else if (result === 'delivery_error') {
      const msg = await ctx.reply(SPREAD_DELIVERY_RETRY_MESSAGE, {
        ...keyboardSpreadAwaitingQuestion(),
        ...TELEGRAM_HTML_PARSE,
      });
      trackSpreadServiceMessage(uid, msg.message_id);
    } else if (result === 'limit_reached') {
      opsEvent('spread_limit_hit');
      await flushSpreadServiceMessages(ctx.telegram, uid);
      endSpreadSession(uid);
      await ctx.reply(spreadLimitMessage(), {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    }
    // 'aborted' — сессию уже сменили/закрыли; ничего не пишем
  } catch (e) {
    // Не даём reply уйти в bot.catch поверх уже обработанного сбоя выдачи.
    logHandlerError('spread_result_reply', e);
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
    const msg = await ctx.reply(questionClarityMessageHtml(clarity.hint), {
      ...keyboardSpreadClarification(),
      ...TELEGRAM_HTML_PARSE,
    });
    trackSpreadServiceMessage(uid, msg.message_id);
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
    const msg = await ctx.reply(questionClarityMessageHtml(clarity.hint), {
      ...keyboardDeepClarification(),
      ...TELEGRAM_HTML_PARSE,
    });
    trackDeepServiceMessage(uid, msg.message_id);
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
      await flushSpreadServiceMessages(ctx.telegram, uid);
      setSpreadPhase(uid, 'awaiting_question');
      setSpreadClarityQuestion(uid, null);
      setSpreadClaritySkipNext(uid, true);
      const msg = await ctx.reply(QUESTION_CLARITY_REFINE_MESSAGE, {
        ...keyboardSpreadAwaitingQuestion(),
        ...TELEGRAM_HTML_PARSE,
      });
      trackSpreadServiceMessage(uid, msg.message_id);
      return;
    }

    const deep = getDeepSession(uid);
    if (deep?.phase === 'awaiting_clarification') {
      await flushDeepServiceMessages(ctx.telegram, uid);
      setDeepPhase(uid, 'awaiting_first_question');
      setDeepClarityQuestion(uid, null);
      setDeepClaritySkipNext(uid, true);
      const msg = await ctx.reply(QUESTION_CLARITY_REFINE_MESSAGE, {
        ...keyboardDeepAwaitingFirst(),
        ...TELEGRAM_HTML_PARSE,
      });
      trackDeepServiceMessage(uid, msg.message_id);
      return;
    }

    await ctx.reply(staleSessionButtonMessageHtml(), {
      ...keyboardOpenMenuWebApp(),
      ...TELEGRAM_HTML_PARSE,
    });
  });

  bot.action(CLARITY_KEEP_CALLBACK, async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const spread = getSpreadSession(uid);
    if (spread?.phase === 'awaiting_clarification' && spread.clarityQuestion) {
      const question = spread.clarityQuestion;
      if (!tryMarkSpreadInFlight(uid)) {
        const busy = await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, {
          ...keyboardSpreadClarification(),
          ...TELEGRAM_HTML_PARSE,
        });
        trackSpreadServiceMessage(uid, busy.message_id);
        return;
      }
      setSpreadClarityQuestion(uid, null);
      setSpreadPhase(uid, 'awaiting_question');
      try {
        // flush внутри runSpreadReadingForUser уберёт подсказку clarity.
        await runSpreadReadingForUser(ctx, uid, question);
      } catch (e) {
        logHandlerError('spread_clarity_keep', e);
        const msg = await ctx.reply(
          `${AI_TEXT_UNAVAILABLE_MESSAGE}\n\n${SPREAD_AI_RETRY_MESSAGE}`,
          {
            ...keyboardSpreadAwaitingQuestion(),
            ...TELEGRAM_HTML_PARSE,
          },
        );
        trackSpreadServiceMessage(uid, msg.message_id);
      } finally {
        clearSpreadInFlight(uid);
      }
      return;
    }

    const deep = getDeepSession(uid);
    if (deep?.phase === 'awaiting_clarification' && deep.clarityQuestion) {
      const question = deep.clarityQuestion;
      if (!tryMarkDeepInFlight(uid)) {
        const busy = await ctx.reply(DEEP_IN_FLIGHT_MESSAGE, {
          ...keyboardDeepClarification(),
          ...TELEGRAM_HTML_PARSE,
        });
        trackDeepServiceMessage(uid, busy.message_id);
        return;
      }
      setDeepClarityQuestion(uid, null);
      setDeepPhase(uid, 'awaiting_first_question');
      try {
        const result = await deliverDeepTriplet(ctx, uid, question);
        if (result === 'deck_empty') {
          logHandlerError('deep_clarity_keep_deck', new Error('deck exhausted'));
          await runDeepFinal(ctx, uid);
        }
      } catch (e) {
        logHandlerError('deep_clarity_keep', e);
        opsDeliveryError('deep_step', e instanceof Error ? e.message : String(e));
        const msg = await ctx.reply(DEEP_STEP_FAILED_MESSAGE, {
          ...keyboardDeepInChain(),
          ...TELEGRAM_HTML_PARSE,
        });
        trackDeepServiceMessage(uid, msg.message_id);
      } finally {
        clearDeepInFlight(uid);
      }
      return;
    }

    await ctx.reply(staleSessionButtonMessageHtml(), {
      ...keyboardOpenMenuWebApp(),
      ...TELEGRAM_HTML_PARSE,
    });
  });
}
