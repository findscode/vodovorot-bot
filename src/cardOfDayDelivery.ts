import type { Telegraf } from 'telegraf';
import type { DrawnCard } from './deck.js';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { dayCardStripPhotoInput } from './spreadComposite.js';
import {
  dayCardFaceCaptionHtml,
  formatReadingForTelegram,
  stripModelFormatArtifacts,
  TELEGRAM_HTML_PARSE,
} from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';
import {
  releaseDayDrawSlotSync,
  tryConsumeDayDrawSlotSync,
} from './db/dayDrawSlotsRepo.js';
import { saveLastReading } from './lastReadingStore.js';
import { CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE } from './botCopy.js';
import { keyboardAfterDayReading } from './botKeyboards.js';
import { dayDrawCalendarDate } from './dayDrawState.js';

const TG_CAPTION_MAX = 1024;

export type CardOfDayDeliveryKind = 'manual' | 'push';

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

async function sendDayReadingChunks(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
  replyToMessageId: number,
): Promise<void> {
  const normalized = stripModelFormatArtifacts(rawText);
  const parts = splitForTelegram(normalized);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const kbLast = keyboardAfterDayReading(chatId);
  const reply = { reply_parameters: { message_id: replyToMessageId } };

  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    const withKb = last ? kbLast : {};
    await telegram.sendMessage(chatId, formatted[i], {
      ...reply,
      ...withKb,
      ...TELEGRAM_HTML_PARSE,
    });
  }

  if (formatted.length > 0) {
    saveLastReading(chatId, normalized);
  }
}

/**
 * Полная выдача «карты дня»: резерв слота на `todayKey`, затем фото/ИИ/чанки.
 * При сбое выдачи слот откатывается; при занятой дате — `slot_race` без сообщений в чат.
 *
 * Для **push** сначала ИИ, затем карта и текст (меньше повторных фото из cron при сбое API).
 */
export async function deliverCardOfDayReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  kind: CardOfDayDeliveryKind,
  withTypingLoop: (task: () => Promise<string>) => Promise<string>,
): Promise<'ok' | 'ai_error' | 'slot_race'> {
  const todayKey = dayDrawCalendarDate();
  if (!tryConsumeDayDrawSlotSync(chatId, todayKey)) {
    return 'slot_race';
  }

  const drawn = drawOne();
  const captionHtml = dayCardFaceCaptionHtml(formatDrawnLine(drawn));
  const voice = drawVoiceArchetype();

  try {
    if (kind === 'push') {
      const rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
      const faceId = await sendCardFaceMessage(telegram, chatId, drawn, captionHtml);
      await sendDayReadingChunks(telegram, chatId, rawText, faceId);
    } else {
      const faceId = await sendCardFaceMessage(telegram, chatId, drawn, captionHtml);
      const rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
      await sendDayReadingChunks(telegram, chatId, rawText, faceId);
    }
    return 'ok';
  } catch {
    releaseDayDrawSlotSync(chatId, todayKey);
    return 'ai_error';
  }
}
