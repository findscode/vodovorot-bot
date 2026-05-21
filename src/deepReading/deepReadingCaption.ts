import { escapeTelegramHtml } from '../readingTelegramHtml.js';

function questionLineHtml(question: string, bold: boolean): string {
  const quoted = `«${escapeTelegramHtml(question)}»`;
  return bold ? `<b>${quoted}</b>` : quoted;
}

/** Подпись: прошлые вопросы в «», текущий — жирным; укладывается в лимит Telegram. */
export function deepReadingCaptionHtmlBounded(
  questions: string[],
  currentIndex: number,
  maxLen: number,
): string {
  if (questions.length === 0) return '';
  let start = 0;
  while (start <= currentIndex) {
    const html = questions
      .slice(start, currentIndex + 1)
      .map((q, i) => questionLineHtml(q, start + i === currentIndex))
      .join('\n');
    if (html.length <= maxLen) return html;
    start++;
  }
  const q = questions[currentIndex] ?? '';
  let trimmed = q;
  while (trimmed.length > 0) {
    const html = questionLineHtml(trimmed, true);
    if (html.length <= maxLen) return html;
    trimmed = `${trimmed.slice(0, Math.max(0, trimmed.length - 20))}…`;
  }
  return questionLineHtml('…', true);
}
