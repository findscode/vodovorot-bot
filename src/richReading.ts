/**
 * Карты и толкование одним сообщением (Rich Message, Bot API 10.1+).
 * Фото — первый блок, затем шапка расклада и толкование; удобно пересылать целиком.
 * При любом сбое возвращаем `false`: вызывающий код шлёт фото и текст по-старому.
 */

import { formatReadingForTelegram } from './readingTelegramHtml.js';
import { opsEvent } from './opsLog.js';
import { callTelegramRaw, TelegramRawApiError, type TelegramApiTarget } from './telegramRawApi.js';

/** Лимит текста rich message в Bot API; берём с запасом. */
const RICH_TEXT_SAFE_LIMIT = 30_000;
/** После «метод не найден» (старый Bot API-сервер) не пробуем rich message это время. */
const RICH_DISABLE_MS = 6 * 60 * 60 * 1000;

const PHOTO_MEDIA_ID = 'cards';
const PHOTO_FILE_FIELD = 'cards_png';

let disabledUntilMs = 0;

/** Выключатель: `RICH_MESSAGES_ENABLED=0` (также false / off / no). */
export function richMessagesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.RICH_MESSAGES_ENABLED?.trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

/**
 * Telegram-HTML (только `<b>` и экранированный текст) → абзацы rich HTML.
 * Пустая строка — новый абзац, одиночный перенос — `<br>`.
 */
export function telegramHtmlToRichParagraphs(html: string): string {
  return html
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export type RichReadingInput = {
  photoPng: Buffer;
  /** Шапка расклада: Telegram-HTML (заголовок, карты, толкователь, тема). */
  headHtml: string;
  /** Сырой текст толкования от модели. */
  readingRaw: string;
  /** Необязательный хвост (Telegram-HTML), например подсказка про «Меню». */
  footerHtml?: string;
  /** Inline-клавиатура; пустая — не отправляется. */
  replyMarkup?: { inline_keyboard: unknown[][] };
};

/** HTML rich message: фото, шапка, толкование, хвост. */
export function buildRichReadingHtml(input: RichReadingInput): string {
  const parts = [
    `<img src="tg://photo?id=${PHOTO_MEDIA_ID}"/>`,
    telegramHtmlToRichParagraphs(input.headHtml),
    telegramHtmlToRichParagraphs(formatReadingForTelegram(input.readingRaw)),
  ];
  if (input.footerHtml) parts.push(telegramHtmlToRichParagraphs(input.footerHtml));
  return parts.filter((p) => p.length > 0).join('\n');
}

/** Только непустая клавиатура (иначе Telegram может отклонить запрос). */
export function nonEmptyInlineMarkup(
  markup: { reply_markup?: { inline_keyboard?: unknown[][] } } | undefined,
): { inline_keyboard: unknown[][] } | undefined {
  const rows = markup?.reply_markup?.inline_keyboard;
  return rows && rows.length > 0 ? { inline_keyboard: rows } : undefined;
}

/** Сбросить временное отключение (тесты). */
export function resetRichMessagesForTests(): void {
  disabledUntilMs = 0;
}

/**
 * Отправляет карты и толкование одним rich message.
 * @returns `true` — доставлено; `false` — выключено или сбой (нужен запасной путь).
 */
export async function trySendRichReading(
  telegram: TelegramApiTarget,
  chatId: number,
  input: RichReadingInput,
  context: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!richMessagesEnabled() || Date.now() < disabledUntilMs) return false;

  const html = buildRichReadingHtml(input);
  if (html.length > RICH_TEXT_SAFE_LIMIT) {
    opsEvent('rich_message_fallback', { context, reason: 'too_long' });
    return false;
  }

  try {
    await callTelegramRaw(
      telegram,
      'sendRichMessage',
      {
        chat_id: chatId,
        rich_message: {
          html,
          skip_entity_detection: true,
          media: [
            { id: PHOTO_MEDIA_ID, media: { type: 'photo', media: `attach://${PHOTO_FILE_FIELD}` } },
          ],
        },
        reply_markup: input.replyMarkup,
      },
      {
        [PHOTO_FILE_FIELD]: {
          buffer: input.photoPng,
          filename: 'cards.png',
          contentType: 'image/png',
        },
      },
      fetchImpl,
    );
    opsEvent('rich_message_sent', { context });
    return true;
  } catch (e) {
    const code = e instanceof TelegramRawApiError ? e.code : undefined;
    if (code === 404) disabledUntilMs = Date.now() + RICH_DISABLE_MS;
    opsEvent('rich_message_fallback', { context, reason: code === undefined ? 'network' : code });
    console.warn('[rich_message]', context, e instanceof Error ? e.message : e);
    return false;
  }
}
