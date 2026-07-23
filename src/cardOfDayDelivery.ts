import type { Telegraf } from 'telegraf';
import type { DrawnCard } from './deck.js';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { isAiFailure } from './aiErrors.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { dayCardStripPhotoInput } from './spreadComposite.js';
import { dayCardFaceCaptionHtml } from './readingTelegramHtml.js';
import { sendReadingChunksToChat } from './readingChunksDelivery.js';
import { releaseDayDrawSlotSync, tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';
import { CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE } from './botCopy.js';
import { keyboardAfterDayReading } from './botKeyboards.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import { opsAiError, opsEvent } from './opsLog.js';

const TG_CAPTION_MAX = 1024;

export type CardOfDayDeliveryResult = 'ok' | 'ai_error' | 'delivery_error' | 'slot_race';

export type DeliverCardOfDayOptions = {
  /** Момент для ключа календарного дня (планировщик передаёт `now` тика cron). */
  at?: Date;
};

async function sendCardFaceMessage(
  telegram: Telegraf['telegram'],
  chatId: number,
  drawn: DrawnCard,
  captionHtml: string,
): Promise<number> {
  const cap = captionHtml.slice(0, TG_CAPTION_MAX);
  if (cardImageExists(drawn.card.id)) {
    const photo = await dayCardStripPhotoInput(drawn);
    const msg = await telegram.sendPhoto(chatId, photo, {
      caption: cap,
      parse_mode: 'HTML',
    });
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
 * Полная выдача «карты дня»: резерв слота, затем ИИ → фото → чанки.
 * При сбое слот откатывается; при занятой дате — `slot_race` без сообщений в чат.
 */
export async function deliverCardOfDayReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  withTypingLoop: (task: () => Promise<string>) => Promise<string>,
  options: DeliverCardOfDayOptions = {},
): Promise<CardOfDayDeliveryResult> {
  const todayKey = dayDrawCalendarDate(options.at);
  if (!tryConsumeDayDrawSlotSync(chatId, todayKey)) {
    return 'slot_race';
  }

  const drawn = drawOne();
  const voice = drawVoiceArchetype();
  const captionHtml = dayCardFaceCaptionHtml(formatDrawnLine(drawn), voice.name);
  const chunkOpts = { lastChunkExtra: keyboardAfterDayReading(chatId) };

  try {
    const rawText = await withTypingLoop(() =>
      completeChat(cardOfDayPrompt(drawn, voice), { opsContext: 'day' }),
    );
    const faceId = await sendCardFaceMessage(telegram, chatId, drawn, captionHtml);
    await sendReadingChunksToChat(telegram, chatId, rawText, faceId, chunkOpts);
    opsEvent('day_draw_delivered');
    return 'ok';
  } catch (e) {
    releaseDayDrawSlotSync(chatId, todayKey);
    if (isAiFailure(e)) {
      opsAiError('day', e instanceof Error ? e.message : String(e));
      return 'ai_error';
    }
    console.error('[day_delivery] delivery_error', e);
    return 'delivery_error';
  }
}
