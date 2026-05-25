import { describe, expect, it } from 'vitest';
import {
  dayCardFaceCaptionHtml,
  escapeTelegramHtml,
  formatReadingForTelegram,
  stripModelFormatArtifacts,
  threeCardSpreadCaptionHtml,
  threeCardSpreadCaptionWithQuestionHtml,
} from './readingTelegramHtml.js';
import { splitForTelegram, TG_MAX } from './telegramChunks.js';

describe('readingTelegramHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeTelegramHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('stripModelFormatArtifacts removes empty-line instruction lines', () => {
    const plain = 'Прошлое\n\nПустая строка.\n\nТекст.';
    expect(stripModelFormatArtifacts(plain)).toBe('Прошлое\n\nТекст.');
    expect(stripModelFormatArtifacts('пустая строка\nX')).toBe('X');
  });

  it('day and three-card captions: bold title, colon, blank line, body', () => {
    expect(dayCardFaceCaptionHtml('Маг (перевёрнутая)')).toBe(
      '<b>Карта на день:</b>\n\nМаг (перевёрнутая)',
    );
    expect(threeCardSpreadCaptionHtml(['Прошлое: X', 'Настоящее: Y'])).toBe(
      '<b>Прошлое, настоящее, будущее:</b>\n\nПрошлое: X\nНастоящее: Y',
    );
  });

  it('three-card caption with question includes theme line', () => {
    expect(
      threeCardSpreadCaptionWithQuestionHtml('Карьера', ['Прошлое: X', 'Настоящее: Y']),
    ).toContain('Тема: «Карьера»');
  });

  it('wraps known section label lines in bold', () => {
    const plain = 'О чём здесь речь\n\nТекст блока.';
    const out = formatReadingForTelegram(plain);
    expect(out).toContain('<b>О чём здесь речь</b>');
    expect(out).toContain('Текст блока.');
  });

  it('split then format: сырой текст режется до лимита, затем HTML не раздувает первую часть критично', () => {
    const label = 'О чём здесь речь';
    const filler = 'word '.repeat(2500);
    const plain = `${label}\n\n${filler}`;
    const parts = splitForTelegram(plain);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(p.length).toBeLessThanOrEqual(TG_MAX);
      const html = formatReadingForTelegram(p);
      expect(html.length).toBeLessThanOrEqual(TG_MAX + 80);
    }
    expect(formatReadingForTelegram(parts[0]!)).toContain('<b>О чём здесь речь</b>');
  });
});
