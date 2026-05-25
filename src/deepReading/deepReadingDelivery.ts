import { Input } from 'telegraf';
import type { Context } from 'telegraf';
import { isFullDeepFinal, deepMaxTripletsForTier, resolveAccessTier } from '../accessTier.js';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DEEP_AI_RETRY_MESSAGE,
  DEEP_COLLAGE_HINT_MESSAGE,
  DEEP_CONTINUE_HINT_MESSAGE,
  DEEP_DONE_HINT,
  DEEP_FINAL_INTRO_MESSAGE,
  DEEP_BASIC_FINAL_INTRO_MESSAGE,
  DEEP_BASIC_FINAL_UPSELL,
  DEEP_IMAGES_UNAVAILABLE_SUFFIX,
  DEEP_MAX_TRIPLETS_MESSAGE,
  DEEP_BASIC_TRIPLET_CAP_MESSAGE,
} from '../botCopy.js';
import { keyboardDeepInChain, keyboardMainOrDayOnly } from '../botKeyboards.js';
import { completeChat } from '../ai.js';
import { cardImageExists } from '../cardAssets.js';
import { drawTripletFromRemainingIds, drawVoiceArchetype } from '../deck.js';
import { deepReadingCaptionHtmlBounded } from './deepReadingCaption.js';
import { tripletStripFrame } from '../spreadComposite.js';
import { fitCompositeForTelegram, stackTripletOnPrevious } from './compositeStack.js';
import { splitTripletModelOutput } from './modelOutput.js';
import { deepBasicFinalPrompt, deepFinalPrompt, deepTripletPrompt } from './prompts.js';
import {
  appendTriplet,
  canAddTriplet,
  endDeepSession,
  getDeepSession,
  setPendingQuestion,
  startDeepSession,
  type DeepSession,
} from './sessionStore.js';
import { shuffledDeckIds } from './sessionDeck.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { sendPlainReadingChunksToChat, sendReadingChunksToChat } from '../readingChunksDelivery.js';
import { withTypingWhile } from '../typingIndicator.js';
import { logHandlerError } from '../handlers/botHelpers.js';
import { opsAiError, opsEvent } from '../opsLog.js';

const TG_CAPTION_MAX = 1024;
const DEEP_MAX_QUESTION_CHARS = 900;

export function beginDeepSession(userId: number, chatId: number): void {
  startDeepSession(userId, chatId, shuffledDeckIds());
}

export async function deliverDeepTriplet(
  ctx: Context,
  userId: number,
  question: string,
): Promise<'ok' | 'ai_error' | 'deck_empty'> {
  const session = getDeepSession(userId);
  const tier = resolveAccessTier(userId);
  const maxTriplets = deepMaxTripletsForTier(tier);
  if (!session || !canAddTriplet(session, maxTriplets)) return 'deck_empty';

  const { drawn, remaining } = drawTripletFromRemainingIds(session.deckRemaining);
  const tripletIndex = session.triplets.length;
  const questions = [...session.triplets.map((t) => t.question), question];
  const captionHtml = deepReadingCaptionHtmlBounded(questions, tripletIndex, TG_CAPTION_MAX, tier);

  const newStrip = await tripletStripFrame(drawn);
  let frame =
    tripletIndex === 0
      ? newStrip
      : session.lastCompositePng !== null
        ? await stackTripletOnPrevious(
            {
              png: session.lastCompositePng,
              width: session.lastCompositeWidth,
              height: session.lastCompositeHeight,
            },
            newStrip,
            tripletIndex,
          )
        : newStrip;

  const allExist = drawn.every((d) => cardImageExists(d.card.id));
  let faceMessageId: number;

  if (tripletIndex >= 4) {
    await ctx.reply(DEEP_COLLAGE_HINT_MESSAGE, TELEGRAM_HTML_PARSE);
  }

  if (allExist) {
    const png = await fitCompositeForTelegram(frame);
    const photo = Input.fromBuffer(png, `deep-triplet-${tripletIndex + 1}.png`);
    const faceMsg = await ctx.replyWithPhoto(photo, {
      caption: captionHtml,
      ...TELEGRAM_HTML_PARSE,
    });
    faceMessageId = faceMsg.message_id;
    frame = { png, width: frame.width, height: frame.height };
  } else {
    const faceMsg = await ctx.reply(
      `${captionHtml}\n\n${DEEP_IMAGES_UNAVAILABLE_SUFFIX}`,
      TELEGRAM_HTML_PARSE,
    );
    faceMessageId = faceMsg.message_id;
  }

  const voice = drawVoiceArchetype();
  const priorSummaries = session.triplets.map((t) => t.summary);

  try {
    const raw = await withTypingWhile(ctx, () =>
      completeChat(deepTripletPrompt(question, drawn, priorSummaries, voice), {
        opsContext: 'deep_triplet',
      }),
    );
    const { userText, summary } = splitTripletModelOutput(raw);
    appendTriplet(userId, { question, cards: drawn, summary }, remaining, {
      png: frame.png,
      width: frame.width,
      height: frame.height,
    });

    await sendPlainReadingChunksToChat(ctx.telegram, userId, userText, faceMessageId);

    const updated = getDeepSession(userId);
    if (updated && updated.triplets.length >= maxTriplets) {
      if (isFullDeepFinal(tier)) {
        await ctx.reply(DEEP_MAX_TRIPLETS_MESSAGE, TELEGRAM_HTML_PARSE);
      } else {
        opsEvent('deep_triplet_limit_hit');
        await ctx.reply(DEEP_BASIC_TRIPLET_CAP_MESSAGE, TELEGRAM_HTML_PARSE);
      }
      await runDeepFinal(ctx, userId);
      return 'ok';
    }

    await ctx.reply(DEEP_CONTINUE_HINT_MESSAGE, {
      ...keyboardDeepInChain(),
      ...TELEGRAM_HTML_PARSE,
    });
    return 'ok';
  } catch (e) {
    logHandlerError('deep_triplet', e);
    opsAiError('deep_triplet', e instanceof Error ? e.message : String(e));
    setPendingQuestion(userId, question);
    await ctx.reply(DEEP_AI_RETRY_MESSAGE, {
      ...keyboardDeepInChain(),
      ...TELEGRAM_HTML_PARSE,
    });
    return 'ai_error';
  }
}

export async function runDeepFinal(ctx: Context, userId: number): Promise<void> {
  const session = getDeepSession(userId);
  if (!session || session.triplets.length === 0) {
    endDeepSession(userId);
    return;
  }

  const tier = resolveAccessTier(userId);
  const fullFinal = isFullDeepFinal(tier);
  const introText = fullFinal ? DEEP_FINAL_INTRO_MESSAGE : DEEP_BASIC_FINAL_INTRO_MESSAGE;
  const intro = await ctx.reply(introText, TELEGRAM_HTML_PARSE);
  const questions = session.triplets.map((t) => t.question);
  const summaries = session.triplets.map((t) => t.summary);
  const prompt = fullFinal
    ? deepFinalPrompt(questions, summaries)
    : deepBasicFinalPrompt(questions, summaries);

  try {
    const raw = await withTypingWhile(ctx, () =>
      completeChat(prompt, {
        max_tokens: fullFinal ? 1200 : 550,
        opsContext: fullFinal ? 'deep_final' : 'deep_final_basic',
      }),
    );
    await sendReadingChunksToChat(ctx.telegram, userId, raw, intro.message_id, {
      lastChunkSuffix: fullFinal ? DEEP_DONE_HINT : DEEP_BASIC_FINAL_UPSELL,
      lastChunkExtra: keyboardMainOrDayOnly(userId),
    });
    opsEvent(fullFinal ? 'deep_final_full' : 'deep_final_basic');
  } catch (e) {
    logHandlerError('deep_final', e);
    opsAiError(
      fullFinal ? 'deep_final' : 'deep_final_basic',
      e instanceof Error ? e.message : String(e),
    );
    await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE, {
      ...keyboardMainOrDayOnly(userId),
      ...TELEGRAM_HTML_PARSE,
    });
  } finally {
    endDeepSession(userId);
  }
}

export function normalizeDeepQuestion(text: string): string | null {
  const q = text.trim();
  if (!q) return null;
  if (q.length > DEEP_MAX_QUESTION_CHARS) return null;
  return q;
}

export function sessionReadyForQuestion(session: DeepSession): boolean {
  return session.phase === 'awaiting_first_question' || session.phase === 'in_chain';
}
