import { Input } from 'telegraf';
import type { Telegraf } from 'telegraf';
import type { AccessTier } from './accessTier.js';
import { drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { isAiFailure } from './aiErrors.js';
import { pastPresentFuturePrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { tripletStripFrame } from './spreadComposite.js';
import { SPREAD_IMAGES_UNAVAILABLE_SUFFIX, SPREAD_DONE_HINT } from './botCopy.js';
import { keyboardMainOrDayOnly } from './botKeyboards.js';
import { sendReadingChunksToChat } from './readingChunksDelivery.js';
import type { AiRunner } from './readingDraft.js';
import { settleAfterFaceBeforeDraft } from './readingFaceGate.js';
import { createReadingProgressMux } from './readingProgressMux.js';
import {
  releaseSpreadDrawSlotByIdSync,
  tryConsumeSpreadDrawSlotSync,
} from './db/spreadDrawSlotsRepo.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import {
  TELEGRAM_HTML_PARSE,
  threeCardSpreadCaptionWithQuestionHtmlBounded,
} from './readingTelegramHtml.js';
import {
  endSpreadSession,
  getSpreadSession,
  isCurrentSpreadSession,
} from './spreadSessionStore.js';
import { opsAiError, opsDeliveryError, opsEvent } from './opsLog.js';

const TG_CAPTION_MAX = 1024;
const POSITIONS = ['Прошлое', 'Настоящее', 'Будущее'] as const;

export type SpreadDeliveryResult =
  | 'ok'
  | 'ai_error'
  | 'delivery_error'
  | 'limit_reached'
  | 'aborted';

/**
 * Полная выдача «три карты» (ПНБ): фото → пауза → поток → текст.
 * ИИ может идти параллельно со сборкой фото; черновик Telegram — только после фото.
 */
export async function deliverSpreadReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  userId: number,
  question: string,
  tier: AccessTier,
  runAi: AiRunner,
): Promise<SpreadDeliveryResult> {
  const session = getSpreadSession(userId);
  const sessionId = session?.id ?? null;

  let slotId: number | null = null;
  if (tier === 'basic') {
    const dayKey = dayDrawCalendarDate();
    slotId = tryConsumeSpreadDrawSlotSync(userId, dayKey);
    if (slotId === null) {
      opsEvent('spread_limit_hit');
      return 'limit_reached';
    }
  }

  const cards = drawThreeUnique();
  const voice = drawVoiceArchetype();
  const lines = cards.map((d, i) => `${POSITIONS[i]}: ${formatDrawnLine(d)}`);
  const captionHtml = threeCardSpreadCaptionWithQuestionHtmlBounded(
    question,
    lines,
    voice.name,
    TG_CAPTION_MAX,
  );

  const allExist = cards.every((d) => cardImageExists(d.card.id));
  const stillCurrent = (): boolean =>
    sessionId !== null && isCurrentSpreadSession(userId, sessionId);

  const releaseIfNeeded = (): void => {
    if (slotId !== null) {
      releaseSpreadDrawSlotByIdSync(slotId);
      slotId = null;
    }
  };

  const mux = createReadingProgressMux();
  const aiPromise = completeChat(pastPresentFuturePrompt(cards, voice, question), {
    opsContext: 'spread',
    onProgress: mux.push,
  });

  try {
    const photoPng = allExist ? (await tripletStripFrame(cards)).png : null;
    if (!stillCurrent()) {
      releaseIfNeeded();
      void aiPromise.catch(() => {});
      return 'aborted';
    }

    let faceMessageId: number;
    if (photoPng !== null) {
      const faceMsg = await telegram.sendPhoto(
        chatId,
        Input.fromBuffer(photoPng, 'spread-past-present-future.png'),
        { caption: captionHtml, ...TELEGRAM_HTML_PARSE },
      );
      faceMessageId = faceMsg.message_id;
    } else {
      const faceMsg = await telegram.sendMessage(
        chatId,
        `${captionHtml}\n\n${SPREAD_IMAGES_UNAVAILABLE_SUFFIX}`,
        TELEGRAM_HTML_PARSE,
      );
      faceMessageId = faceMsg.message_id;
    }

    if (!stillCurrent()) {
      releaseIfNeeded();
      void aiPromise.catch(() => {});
      return 'aborted';
    }

    await settleAfterFaceBeforeDraft();
    if (!stillCurrent()) {
      releaseIfNeeded();
      void aiPromise.catch(() => {});
      return 'aborted';
    }

    const rawText = await runAi('reading', async (onProgress) => {
      const unbind = mux.bind(onProgress);
      try {
        return await aiPromise;
      } finally {
        unbind();
      }
    });
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }

    await sendReadingChunksToChat(telegram, chatId, rawText, faceMessageId, {
      lastChunkSuffix: SPREAD_DONE_HINT,
      lastChunkExtra: keyboardMainOrDayOnly(userId),
      shouldContinue: stillCurrent,
    });
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }

    endSpreadSession(userId);
    opsEvent('spread_completed');
    return 'ok';
  } catch (e) {
    void aiPromise.catch(() => {});
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }
    releaseIfNeeded();
    const detail = e instanceof Error ? e.message : String(e);
    if (isAiFailure(e)) {
      opsAiError('spread', detail);
      console.error('[spread_delivery] ai_error', detail);
      return 'ai_error';
    }
    opsDeliveryError('spread', detail);
    console.error('[spread_delivery] delivery_error', e);
    return 'delivery_error';
  }
}
