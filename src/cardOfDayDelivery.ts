import type { Telegraf } from 'telegraf';
import type { DrawnCard } from './deck.js';
import { drawOne, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { cardPhotoInput } from './cardPhotoInput.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';
import { countDayDrawSlotsForUserSync, tryConsumeDayDrawSlotSync } from './db/dayDrawSlotsRepo.js';
import { saveLastReading } from './lastReadingStore.js';
import { FIRST_DAY_PUSH_FOOTER_HTML } from './botCopy.js';
import { keyboardAfterDayReading, keyboardSubscribeDayPushOnly } from './botKeyboards.js';
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
    await telegram.sendMessage(
      chatId,
      `${line}\n\nКартинку карты сейчас не показать — толкование всё равно пришлю ниже.`,
    );
  }
}

async function sendDayReadingChunks(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
  opts: { firstLifetimeManualDayDraw: boolean },
): Promise<void> {
  const parts = splitForTelegram(rawText);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const kbLast = keyboardAfterDayReading(chatId);
  const hideMainKeysOnLast = opts.firstLifetimeManualDayDraw;

  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    const withKb = last && !hideMainKeysOnLast ? kbLast : {};
    await telegram.sendMessage(chatId, formatted[i], {
      ...withKb,
      ...TELEGRAM_HTML_PARSE,
    });
  }

  if (formatted.length > 0) {
    saveLastReading(chatId, rawText);
  }

  if (hideMainKeysOnLast && formatted.length > 0) {
    await telegram.sendMessage(chatId, FIRST_DAY_PUSH_FOOTER_HTML, {
      ...keyboardSubscribeDayPushOnly(),
      ...TELEGRAM_HTML_PARSE,
    });
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
  const firstLifetimeManualDayDraw =
    kind === 'manual' && countDayDrawSlotsForUserSync(chatId) === 0;

  if (kind === 'push') {
    let rawText: string;
    try {
      rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
    } catch {
      return 'ai_error';
    }
    await sendCardFaceMessage(telegram, chatId, drawn, line);
    await sendDayReadingChunks(telegram, chatId, rawText, { firstLifetimeManualDayDraw: false });
  } else {
    await sendCardFaceMessage(telegram, chatId, drawn, line);
    await telegram.sendMessage(chatId, 'Секунду, собираю текст толкования…');
    let rawText: string;
    try {
      rawText = await withTypingLoop(() => completeChat(cardOfDayPrompt(drawn, voice)));
    } catch {
      return 'ai_error';
    }
    await sendDayReadingChunks(telegram, chatId, rawText, { firstLifetimeManualDayDraw });
  }

  const reserved = tryConsumeDayDrawSlotSync(chatId, todayKey);
  if (!reserved) {
    return 'slot_race';
  }
  return 'ok';
}
