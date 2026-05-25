import type { Telegraf } from 'telegraf';
import {
  escapeTelegramHtml,
  formatReadingForTelegram,
  stripModelFormatArtifacts,
  TELEGRAM_HTML_PARSE,
} from './readingTelegramHtml.js';
import { splitForTelegram } from './telegramChunks.js';

type TelegramSendMessageExtra = NonNullable<Parameters<Telegraf['telegram']['sendMessage']>[2]>;

export type ReadingChunksOptions = {
  lastChunkSuffix?: string;
  /** Доп. поля последнего `sendMessage` (клавиатура и т.п.). */
  lastChunkExtra?: TelegramSendMessageExtra;
};

/** Нарезка толкования на сообщения Telegram (общий код для расклада и «карты дня»). */
export async function sendReadingChunksToChat(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
  replyToMessageId: number,
  options: ReadingChunksOptions = {},
): Promise<void> {
  const normalized = stripModelFormatArtifacts(rawText);
  const parts = splitForTelegram(normalized);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  const reply = { reply_parameters: { message_id: replyToMessageId } };

  for (let i = 0; i < formatted.length; i++) {
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

/** Толкование без меток разделов (глубинная диагностика, триплет). */
export async function sendPlainReadingChunksToChat(
  telegram: Telegraf['telegram'],
  chatId: number,
  rawText: string,
  replyToMessageId: number,
  options: ReadingChunksOptions = {},
): Promise<void> {
  const normalized = stripModelFormatArtifacts(rawText);
  const parts = splitForTelegram(normalized);
  const formatted = parts.map((c) => escapeTelegramHtml(c));
  const reply = { reply_parameters: { message_id: replyToMessageId } };

  for (let i = 0; i < formatted.length; i++) {
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
