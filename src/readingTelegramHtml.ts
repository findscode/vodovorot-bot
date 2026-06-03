/**
 * Оформление толкования для Telegram: parse_mode HTML.
 * Метки разделов — строки из READING_SECTION_LABELS (см. brandFormat.ts), без тире в конце.
 */

import { isReadingSectionLabelLine, sanitizeReadingModelText } from './brandFormat.js';

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

/** Убирает артефакты модели («Пустая строка.», эхо «строка-метка ровно: …»). */
export function stripModelFormatArtifacts(plain: string): string {
  return sanitizeReadingModelText(plain);
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

function spreadQuestionLineHtml(question: string): string {
  return `Тема: «${escapeTelegramHtml(question)}»`;
}

/** Подпись с темой вопроса перед строками карт. */
export function threeCardSpreadCaptionWithQuestionHtml(
  question: string,
  linesPlain: string[],
): string {
  const parts = [
    `<b>${escapeTelegramHtml(THREE_POSITION_SPREAD_TITLE)}:</b>`,
    '',
    spreadQuestionLineHtml(question),
    '',
    ...linesPlain.map((l) => escapeTelegramHtml(l)),
  ];
  return parts.join('\n');
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

/** Подпись с вопросом, укладывается в `maxLen`: сначала укорачиваются строки карт, затем вопрос. */
export function threeCardSpreadCaptionWithQuestionHtmlBounded(
  question: string,
  linesPlain: string[],
  maxLen: number,
): string {
  const cardLines = [...linesPlain];
  let q = question.trim();
  while (true) {
    const html = threeCardSpreadCaptionWithQuestionHtml(q, cardLines);
    if (html.length <= maxLen) return html;
    if (cardLines.length > 1) {
      cardLines.pop();
      continue;
    }
    if (q.length > 1) {
      q = `${q.slice(0, Math.max(1, q.length - 8))}…`;
      continue;
    }
    return `<b>${escapeTelegramHtml(THREE_POSITION_SPREAD_TITLE)}:</b>`;
  }
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
