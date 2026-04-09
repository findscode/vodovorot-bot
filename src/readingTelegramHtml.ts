/**
 * Оформление толкования для Telegram: parse_mode HTML.
 * Метки разделов — строки из READING_SECTION_LABELS (см. brandFormat.ts), без тире в конце.
 */

import { isReadingSectionLabelLine } from './brandFormat.js';

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/** Экранирование для Telegram HTML (теги допускаются только с нашей стороны после экранирования тела). */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/[&<>]/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

/**
 * Плоский текст от модели → безопасный HTML: экранирование + <b> для строк-меток.
 */
export function formatReadingForTelegram(plain: string): string {
  const escaped = escapeTelegramHtml(plain);
  return escaped
    .split('\n')
    .map((line) => (isReadingSectionLabelLine(line) ? `<b>${line.trim()}</b>` : line))
    .join('\n');
}

export const TELEGRAM_HTML_PARSE = { parse_mode: 'HTML' as const };
