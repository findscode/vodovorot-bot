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
import { nonEmptyInlineMarkup, trySendRichReading } from './richReading.js';
import type { AiRunner } from './readingDraft.js';
import {
  releaseSpreadDrawSlotByIdSync,
  tryConsumeSpreadDrawSlotSync,
} from './db/spreadDrawSlotsRepo.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import {
  TELEGRAM_HTML_PARSE,
  threeCardSpreadCaptionWithQuestionHtml,
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
 * Полная выдача «три карты» (ПНБ): для basic — резерв слота, затем ИИ → фото + текст.
 * Основной путь — одно сообщение (rich message); запасной — фото и чанки текста.
 * Premium и админ — без лимита и без записи в БД.
 * При сбое ИИ/доставки сессия сохраняется (можно повторить вопрос); слот откатывается.
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

  try {
    // Фото собирается параллельно с ИИ, а отправляется только после текста.
    const photoTask = allExist
      ? tripletStripFrame(cards).then((f) => f.png)
      : Promise.resolve(null);
    photoTask.catch(() => {});
    const rawText = await runAi('reading', (onProgress) =>
      completeChat(pastPresentFuturePrompt(cards, voice, question), {
        opsContext: 'spread',
        onProgress,
      }),
    );
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }

    const photoPng = await photoTask;
    if (!stillCurrent()) {
      releaseIfNeeded();
      return 'aborted';
    }

    const sentAsOne =
      photoPng !== null &&
      (await trySendRichReading(
        telegram,
        chatId,
        {
          photoPng,
          // В одном сообщении лимита подписи (1024) нет — шапка целиком, с полной темой.
          headHtml: threeCardSpreadCaptionWithQuestionHtml(question, lines, voice.name),
          readingRaw: rawText,
          footerHtml: SPREAD_DONE_HINT,
          replyMarkup: nonEmptyInlineMarkup(keyboardMainOrDayOnly(userId)),
        },
        'spread',
      ));

    if (!sentAsOne) {
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
        return 'aborted';
      }

      await sendReadingChunksToChat(telegram, chatId, rawText, faceMessageId, {
        lastChunkSuffix: SPREAD_DONE_HINT,
        lastChunkExtra: keyboardMainOrDayOnly(userId),
        shouldContinue: stillCurrent,
      });
    }
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
