import { escapeTelegramHtml } from '../readingTelegramHtml.js';

function questionLineHtml(question: string, number: number, bold: boolean): string {
  const prefix = `${number}. `;
  const quoted = `«${escapeTelegramHtml(question)}»`;
  const line = `${prefix}${quoted}`;
  return bold ? `<b>${line}</b>` : line;
}

/** Подпись: нумерованные вопросы в «», текущий — жирным; между вопросами — пустая строка. */
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
      .map((q, i) => {
        const n = start + i + 1;
        return questionLineHtml(q, n, start + i === currentIndex);
      })
      .join('\n\n');
    if (html.length <= maxLen) return html;
    start++;
  }
  const q = questions[currentIndex] ?? '';
  let trimmed = q;
  const n = currentIndex + 1;
  while (trimmed.length > 0) {
    const html = questionLineHtml(trimmed, n, true);
    if (html.length <= maxLen) return html;
    trimmed = `${trimmed.slice(0, Math.max(0, trimmed.length - 20))}…`;
  }
  return questionLineHtml('…', n, true);
}
