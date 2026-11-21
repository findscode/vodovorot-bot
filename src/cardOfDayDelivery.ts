import { Input } from 'telegraf';
import type { Telegraf } from 'telegraf';
import type { DrawnCard } from './deck.js';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { isAiFailure } from './aiErrors.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { dayCardStripPng } from './spreadComposite.js';
import { dayCardFaceCaptionHtml } from './readingTelegramHtml.js';
import { sendReadingChunksToChat } from './readingChunksDelivery.js';
import { nonEmptyInlineMarkup, trySendRichReading } from './richReading.js';
import type { AiRunner } from './readingDraft.js';
import { releaseDayDrawSlotSync, tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';
import { CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE } from './botCopy.js';
import { keyboardAfterDayReading } from './botKeyboards.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import { opsAiError, opsDeliveryError, opsEvent } from './opsLog.js';

const TG_CAPTION_MAX = 1024;

export type CardOfDayDeliveryResult = 'ok' | 'ai_error' | 'delivery_error' | 'slot_race';

export type DeliverCardOfDayOptions = {
  /** Момент для ключа календарного дня (планировщик передаёт `now` тика cron). */
  at?: Date;
};

/** Запасной путь: фото (или текстовая заглушка) отдельным сообщением; возвращает его id. */
async function sendCardFaceMessage(
  telegram: Telegraf['telegram'],
  chatId: number,
  photoPng: Buffer | null,
  captionHtml: string,
): Promise<number> {
  const cap = captionHtml.slice(0, TG_CAPTION_MAX);
  if (photoPng !== null) {
    const msg = await telegram.sendPhoto(
      chatId,
      Input.fromBuffer(photoPng, 'spread-day-card.png'),
      {
        caption: cap,
        parse_mode: 'HTML',
      },
    );
    return msg.message_id;
  }
  const msg = await telegram.sendMessage(
    chatId,
    `${cap}\n\n${CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE}`,
    {
      parse_mode: 'HTML',
    },
  );
  return msg.message_id;
}

/**
 * Полная выдача «карты дня»: резерв слота, затем ИИ → фото + текст.
 * Основной путь — одно сообщение (rich message); запасной — фото и чанки текста.
 * При сбое слот откатывается; при занятой дате — `slot_race` без сообщений в чат.
 */
export async function deliverCardOfDayReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  runAi: AiRunner,
  options: DeliverCardOfDayOptions = {},
): Promise<CardOfDayDeliveryResult> {
  const todayKey = dayDrawCalendarDate(options.at);
  if (!tryConsumeDayDrawSlotSync(chatId, todayKey)) {
    return 'slot_race';
  }

  const drawn: DrawnCard = drawOne();
  const voice = drawVoiceArchetype();
  const captionHtml = dayCardFaceCaptionHtml(formatDrawnLine(drawn), voice.name);
  const afterReading = keyboardAfterDayReading(chatId);

  try {
    const rawText = await runAi('reading', (onProgress) =>
      completeChat(cardOfDayPrompt(drawn, voice), { opsContext: 'day', onProgress }),
    );
    const photoPng = cardImageExists(drawn.card.id) ? await dayCardStripPng(drawn) : null;

    const sentAsOne =
      photoPng !== null &&
      (await trySendRichReading(
        telegram,
        chatId,
        {
          photoPng,
          headHtml: captionHtml,
          readingRaw: rawText,
          replyMarkup: nonEmptyInlineMarkup(afterReading),
        },
        'day',
      ));

    if (!sentAsOne) {
      const faceId = await sendCardFaceMessage(telegram, chatId, photoPng, captionHtml);
      await sendReadingChunksToChat(telegram, chatId, rawText, faceId, {
        lastChunkExtra: afterReading,
      });
    }
    opsEvent('day_draw_delivered');
    return 'ok';
  } catch (e) {
    releaseDayDrawSlotSync(chatId, todayKey);
    if (isAiFailure(e)) {
      opsAiError('day', e instanceof Error ? e.message : String(e));
      return 'ai_error';
    }
    opsDeliveryError('day', e instanceof Error ? e.message : String(e));
    console.error('[day_delivery] delivery_error', e);
    return 'delivery_error';
  }
}
