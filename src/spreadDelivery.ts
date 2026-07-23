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
import {
  endSpreadSession,
  getSpreadSession,
  isCurrentSpreadSession,
} from './spreadSessionStore.js';
import { opsAiError, opsEvent } from './opsLog.js';

const TG_CAPTION_MAX = 1024;
const POSITIONS = ['Прошлое', 'Настоящее', 'Будущее'] as const;

export type SpreadDeliveryResult =
  | 'ok'
  | 'ai_error'
  | 'delivery_error'
  | 'limit_reached'
  | 'aborted';

/**
 * Полная выдача «три карты»: для basic — резерв слота, затем ИИ → фото → чанки.
 * Premium и админ — без лимита и без записи в БД.
 * При сбое ИИ/доставки сессия сохраняется (можно повторить вопрос); слот откатывается.
 */
export async function deliverSpreadReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  userId: number,
  question: string,
  tier: AccessTier,
  withTypingLoop: (task: () => Promise<string>) => Promise<string>,
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

  try {
    const rawText = await withTypingLoop(() =>
      completeChat(pastPresentFuturePrompt(cards, voice, question), { opsContext: 'spread' }),
    );
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }

    let faceMessageId: number;
    if (allExist) {
      const photo = await spreadCompositePhotoInput(cards);
      if (!stillCurrent()) {
        releaseIfNeeded();
        return 'aborted';
      }
      const faceMsg = await telegram.sendPhoto(chatId, photo, {
        caption: captionHtml,
        ...TELEGRAM_HTML_PARSE,
      });
      faceMessageId = faceMsg.message_id;
    } else {
      if (!stillCurrent()) {
        releaseIfNeeded();
        return 'aborted';
      }
      const faceMsg = await telegram.sendMessage(
        chatId,
        `${captionHtml}\n\n${SPREAD_IMAGES_UNAVAILABLE_SUFFIX}`,
        TELEGRAM_HTML_PARSE,
      );
      faceMessageId = faceMsg.message_id;
    }

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
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }
    releaseIfNeeded();
    // Сессию не сбрасываем: пользователь может повторить вопрос в том же раскладе.
    if (isAiFailure(e)) {
      opsAiError('spread', e instanceof Error ? e.message : String(e));
      console.error('[spread_delivery] ai_error', e instanceof Error ? e.message : e);
      return 'ai_error';
    }
    console.error('[spread_delivery] delivery_error', e);
    return 'delivery_error';
  }
}
