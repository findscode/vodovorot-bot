import type { Telegraf } from 'telegraf';
import type { DrawnCard } from './deck.js';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { cardPhotoInput } from './cardPhotoInput.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';
import { tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';
import { saveLastReading } from './lastReadingStore.js';
import { CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE, READING_BUILDING_MESSAGE } from './botCopy.js';
import { keyboardAfterDayReading } from './botKeyboards.js';
import { moscowCalendarDate } from './dayDrawState.js';

const TG_CAPTION_MAX = 1024;

export type CardOfDayDeliveryKind = 'manual' | 'push';

async function sendCardFaceMessage(
  telegram: Telegraf['telegram'],
  chatId: number,
  drawn: DrawnCard,
  line: string,
): Promise<void> {
  if (cardImageExists(drawn.card.id)) {
    const photo = await cardPhotoInput(drawn.card.id, drawn.reversed);
    await telegram.sendPhoto(chatId, photo, {
      caption: line.slice(0, TG_CAPTION_MAX),
    });
  } else {
    await telegram.sendMessage(chatId, `${line}\n\n${CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE}`);
  }
}

async function sendDayReadingChunks(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
): Promise<void> {
  const parts = splitForTelegram(rawText);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const kbLast = keyboardAfterDayReading(chatId);

  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    const withKb = last ? kbLast : {};
    await telegram.sendMessage(chatId, formatted[i], {
      ...withKb,
      ...TELEGRAM_HTML_PARSE,
    });
  }

  if (formatted.length > 0) {
    saveLastReading(chatId, rawText);
  }
}

/**
 * Полная выдача «карты дня»: фото/текст, ИИ, нарезка сообщений, резерв слота на `todayKey`.
 * Вызывайте только если слот на `todayKey` ещё не занят.
 *
 * Для **push** сначала запрашивается ИИ, затем карта и текст: при сбое API пользователь не получает
 * повторяющиеся фото из минутного cron.
 */
export async function deliverCardOfDayReading(
  telegram: Telegraf['telegram'],
  chatId: number,
  kind: CardOfDayDeliveryKind,
  withTypingLoop: (task: () => Promise<string>) => Promise<string>,
): Promise<'ok' | 'ai_error' | 'slot_race'> {
  const todayKey = moscowCalendarDate();
  const drawn = drawOne();
  const line = `День: ${formatDrawnLine(drawn)}`;
  const voice = drawVoiceArchetype();
  if (kind === 'push') {
    let rawText: string;
    try {
      rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
    } catch {
      return 'ai_error';
    }
    await sendCardFaceMessage(telegram, chatId, drawn, line);
    await sendDayReadingChunks(telegram, chatId, rawText);
  } else {
    await sendCardFaceMessage(telegram, chatId, drawn, line);
    await telegram.sendMessage(chatId, READING_BUILDING_MESSAGE);
    let rawText: string;
    try {
      rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
    } catch {
      return 'ai_error';
    }
    await sendDayReadingChunks(telegram, chatId, rawText);
  }

  const reserved = tryConsumeDayDrawSlotSync(chatId, todayKey);
  if (!reserved) {
    return 'slot_race';
  }
  return 'ok';
}
