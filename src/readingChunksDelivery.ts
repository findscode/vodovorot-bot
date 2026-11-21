import type { Telegraf } from 'telegraf';
import {
  formatReadingForTelegram,
  prepareReadingPlain,
  TELEGRAM_HTML_PARSE,
} from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';

type TelegramSendMessageExtra = NonNullable<Parameters<Telegraf['telegram']['sendMessage']>[2]>;

export type ReadingChunksOptions = {
  lastChunkSuffix?: string;
  /** Доп. поля последнего `sendMessage` (клавиатура и т.п.). */
  lastChunkExtra?: TelegramSendMessageExtra;
  /** Если вернёт false — остановить отправку оставшихся чанков (abort сессии). */
  shouldContinue?: () => boolean;
};

/** Нарезка толкования на сообщения Telegram (день, ПНБ, шаги и финал deep). */
export async function sendReadingChunksToChat(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
  replyToMessageId: number,
  options: ReadingChunksOptions = {},
): Promise<void> {
  const normalized = prepareReadingPlain(rawText);
  const parts = splitForTelegram(normalized);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const reply = { reply_parameters: { message_id: replyToMessageId } };

  for (let i = 0; i < formatted.length; i++) {
    if (options.shouldContinue && !options.shouldContinue()) return;
    const last = i === formatted.length - 1;
    let body = formatted[i];
    let extra: TelegramSendMessageExtra = {};
    if (last) {
      if (options.lastChunkSuffix) {
        body = `${body}\n\n${options.lastChunkSuffix}`;
      }
      if (options.lastChunkExtra) {
        extra = options.lastChunkExtra;
      }
    }
    await telegram.sendMessage(chatId, body, {
      ...reply,
      ...extra,
      ...TELEGRAM_HTML_PARSE,
    });
  }
}
