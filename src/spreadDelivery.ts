import type { Telegraf } from 'telegraf';
import type { AccessTier } from './accessTier.js';
import { drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { isAiFailure } from './aiErrors.js';
import { pastPresentFuturePrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { spreadCompositePhotoInput } from './spreadComposite.js';
import { SPREAD_IMAGES_UNAVAILABLE_SUFFIX, SPREAD_DONE_HINT } from './botCopy.js';
import { keyboardMainOrDayOnly } from './botKeyboards.js';
import { sendReadingChunksToChat } from './readingChunksDelivery.js';
import {
  releaseSpreadDrawSlotByIdSync,
  tryConsumeSpreadDrawSlotSync,
} from './db/spreadDrawSlotsRepo.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import {
  TELEGRAM_HTML_PARSE,
  threeCardSpreadCaptionWithQuestionHtmlBounded,
} from './readingTelegramHtml.js';
import { endSpreadSession } from './spreadSessionStore.js';

const TG_CAPTION_MAX = 1024;
const POSITIONS = ['Прошлое', 'Настоящее', 'Будущее'] as const;

export type SpreadDeliveryResult = 'ok' | 'ai_error' | 'delivery_error' | 'limit_reached';

/**
 * Полная выдача «три карты»: для basic — резерв слота, затем фото → ИИ → чанки.
 * Premium и админ — без лимита и без записи в БД.
 */
export async function deliverSpreadReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  userId: number,
  question: string,
  tier: AccessTier,
  withTypingLoop: (task: () => Promise<string>) => Promise<string>,
): Promise<SpreadDeliveryResult> {
  let slotId: number | null = null;
  if (tier === 'basic') {
    const dayKey = dayDrawCalendarDate();
    slotId = tryConsumeSpreadDrawSlotSync(userId, dayKey);
    if (slotId === null) return 'limit_reached';
  }

  const cards = drawThreeUnique();
  const lines = cards.map((d, i) => `${POSITIONS[i]}: ${formatDrawnLine(d)}`);
  const captionHtml = threeCardSpreadCaptionWithQuestionHtmlBounded(
    question,
    lines,
    TG_CAPTION_MAX,
  );

  const allExist = cards.every((d) => cardImageExists(d.card.id));
  const voice = drawVoiceArchetype();
  const chunkOpts = {
    lastChunkSuffix: SPREAD_DONE_HINT,
    lastChunkExtra: keyboardMainOrDayOnly(userId),
  };

  try {
    let faceMessageId: number;
    if (allExist) {
      const photo = await spreadCompositePhotoInput(cards);
      const faceMsg = await telegram.sendPhoto(chatId, photo, {
        caption: captionHtml,
        ...TELEGRAM_HTML_PARSE,
      });
      faceMessageId = faceMsg.message_id;
    } else {
      const faceMsg = await telegram.sendMessage(
        chatId,
        `${captionHtml}\n\n${SPREAD_IMAGES_UNAVAILABLE_SUFFIX}`,
        TELEGRAM_HTML_PARSE,
      );
      faceMessageId = faceMsg.message_id;
    }

    const rawText = await withTypingLoop(() =>
      completeChat(pastPresentFuturePrompt(cards, voice, question)),
    );
    await sendReadingChunksToChat(telegram, chatId, rawText, faceMessageId, chunkOpts);
    endSpreadSession(userId);
    return 'ok';
  } catch (e) {
    if (slotId !== null) {
      releaseSpreadDrawSlotByIdSync(slotId);
    }
    endSpreadSession(userId);
    if (isAiFailure(e)) {
      console.error('[spread_delivery] ai_error', e instanceof Error ? e.message : e);
      return 'ai_error';
    }
    console.error('[spread_delivery] delivery_error', e);
    return 'delivery_error';
  }
}
