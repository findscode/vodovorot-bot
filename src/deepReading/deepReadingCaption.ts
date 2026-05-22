import type { AccessTier } from '../accessTier.js';
import { escapeTelegramHtml } from '../readingTelegramHtml.js';
import { spreadTitleLineHtml } from '../spreadLabels.js';

function questionLineHtml(question: string, number: number, bold: boolean): string {
  const prefix = `${number}. `;
  const quoted = `«${escapeTelegramHtml(question)}»`;
  const line = `${prefix}${quoted}`;
  return bold ? `<b>${line}</b>` : line;
}

function appendSessionHeader(body: string, tier: AccessTier): string {
  const header = `${spreadTitleLineHtml(tier, 'deep')}\n\n`;
  return `${header}${body}`;
}

/** Подпись: название гадания с emoji, затем вопросы в «»; текущий — жирным; между вопросами — пустая строка. */
export function deepReadingCaptionHtmlBounded(
  questions: string[],
  currentIndex: number,
  maxLen: number,
  tier: AccessTier,
): string {
  if (questions.length === 0) return spreadTitleLineHtml(tier, 'deep');
  let start = 0;
  while (start <= currentIndex) {
    const html = questions
      .slice(start, currentIndex + 1)
      .map((q, i) => {
        const n = start + i + 1;
        return questionLineHtml(q, n, start + i === currentIndex);
      })
      .join('\n\n');
    const withHeader = appendSessionHeader(html, tier);
    if (withHeader.length <= maxLen) return withHeader;
    start++;
  }
  const q = questions[currentIndex] ?? '';
  let trimmed = q;
  const n = currentIndex + 1;
  while (trimmed.length > 0) {
    const html = questionLineHtml(trimmed, n, true);
    const withHeader = appendSessionHeader(html, tier);
    if (withHeader.length <= maxLen) return withHeader;
    trimmed = `${trimmed.slice(0, Math.max(0, trimmed.length - 20))}…`;
  }
  return appendSessionHeader(questionLineHtml('…', n, true), tier);
}
