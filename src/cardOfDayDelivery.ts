import type { Telegraf } from 'telegraf';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { cardPhotoInput } from './cardPhotoInput.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';
import { tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';
import { saveLastReading } from './lastReadingStore.js';
import { keyboardAfterDayReading } from './botKeyboards.js';
import { moscowCalendarDate } from './dayDrawState.js';

const TG_CAPTION_MAX = 1024;

export type CardOfDayDeliveryKind = 'manual' | 'push';

/**
 * Полная выдача «карты дня»: фото/текст, ИИ, нарезка сообщений, резерв слота на `todayKey`.
 * Вызывайте только если слот на `todayKey` ещё не занят.
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

  if (cardImageExists(drawn.card.id)) {
    const photo = await cardPhotoInput(drawn.card.id, drawn.reversed);
    await telegram.sendPhoto(chatId, photo, {
      caption: line.slice(0, TG_CAPTION_MAX),
    });
  } else {
    await telegram.sendMessage(
      chatId,
      `${line}\n\nКартинку карты сейчас не показать — толкование всё равно пришлю ниже.`,
    );
  }

  const intro =
    kind === 'push'
      ? 'Карта дня по подписке. Секунду, собираю текст…'
      : 'Секунду, собираю текст толкования…';
  await telegram.sendMessage(chatId, intro);

  const voice = drawVoiceArchetype();
  let rawText: string;
  try {
    rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
  } catch {
    return 'ai_error';
  }

  const parts = splitForTelegram(rawText);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const kbLast = keyboardAfterDayReading(chatId);

  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    await telegram.sendMessage(chatId, formatted[i], {
      ...(last ? kbLast : {}),
      ...TELEGRAM_HTML_PARSE,
    });
  }

  if (formatted.length > 0) {
    saveLastReading(chatId, formatted.join('\n\n'));
  }

  const reserved = tryConsumeDayDrawSlotSync(chatId, todayKey);
  if (!reserved) {
    return 'slot_race';
  }
  return 'ok';
}
