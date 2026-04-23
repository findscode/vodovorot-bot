/**
 * Оформление толкования для Telegram: parse_mode HTML.
 * Метки разделов — строки из READING_SECTION_LABELS (см. brandFormat.ts), без тире в конце.
 */

import { isReadingSectionLabelLine } from './brandFormat.js';

/** Заголовки в подписи к фото (без HTML — экранируются в шаблонах). */
export const DAY_CARD_FACE_TITLE = 'Карта на день';
export const THREE_POSITION_SPREAD_TITLE = 'Прошлое, настоящее, будущее';

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/** Экранирование для Telegram HTML (теги допускаются только с нашей стороны после экранирования тела). */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/[&<>]/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

/** Убирает строки-артефакты из инструкций модели («Пустая строка.» и варианты). */
export function stripModelFormatArtifacts(plain: string): string {
  const cleaned = plain
    .split('\n')
    .filter((line) => !/^\s*Пустая строка\.?\s*$/i.test(line))
    .join('\n');
  return cleaned.replace(/\n{3,}/g, '\n\n');
}

/** Подпись к фото «карта дня»: жирный заголовок, пустая строка, строка карты. */
export function dayCardFaceCaptionHtml(drawnLinePlain: string): string {
  return `<b>${escapeTelegramHtml(DAY_CARD_FACE_TITLE)}:</b>\n\n${escapeTelegramHtml(drawnLinePlain)}`;
}

/** Подпись к коллажу «три карты»: жирный заголовок, пустая строка, строки позиций. */
export function threeCardSpreadCaptionHtml(linesPlain: string[]): string {
  const body = linesPlain.map((l) => escapeTelegramHtml(l)).join('\n');
  return `<b>${escapeTelegramHtml(THREE_POSITION_SPREAD_TITLE)}:</b>\n\n${body}`;
}

/** Подпись не длиннее `maxLen` (UTF-16 длина HTML для лимита Telegram). */
export function threeCardSpreadCaptionHtmlBounded(linesPlain: string[], maxLen: number): string {
  const copy = [...linesPlain];
  while (copy.length >= 1) {
    const html = threeCardSpreadCaptionHtml(copy);
    if (html.length <= maxLen) return html;
    copy.pop();
  }
  return `<b>${escapeTelegramHtml(THREE_POSITION_SPREAD_TITLE)}:</b>`;
}

/**
 * Плоский текст от модели → безопасный HTML: экранирование + <b> для строк-меток.
 */
export function formatReadingForTelegram(plain: string): string {
  const stripped = stripModelFormatArtifacts(plain);
  const escaped = escapeTelegramHtml(stripped);
  return escaped
    .split('\n')
    .map((line) => (isReadingSectionLabelLine(line) ? `<b>${line.trim()}</b>` : line))
    .join('\n');
}

export const TELEGRAM_HTML_PARSE = { parse_mode: 'HTML' as const };
