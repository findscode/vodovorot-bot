import { describe, expect, it } from 'vitest';
import {
  dayCardFaceCaptionHtml,
  escapeTelegramHtml,
  formatReadingForTelegram,
  stripModelFormatArtifacts,
  threeCardSpreadCaptionHtml,
  threeCardSpreadCaptionWithQuestionHtml,
  threeCardSpreadCaptionWithQuestionHtmlBounded,
  voiceArchetypeCaptionLineHtml,
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

  it('stripModelFormatArtifacts normalizes echoed meta label lines', () => {
    const plain = 'Отдельная строка-метка ровно: О чём здесь речь\n\nАбзац.';
    expect(stripModelFormatArtifacts(plain)).toBe('О чём здесь речь\n\nАбзац.');
    const html = formatReadingForTelegram(plain);
    expect(html).toContain('<b>О чём здесь речь</b>');
    expect(html).not.toContain('строка-метка');
  });

  it('day and three-card captions: bold title, colon, blank line, body', () => {
    expect(dayCardFaceCaptionHtml('Маг (перевёрнутая)', 'Иерофант')).toBe(
      '<b>Карта на день:</b>\n\nМаг (перевёрнутая)\n\nТолкователь: «Иерофант»',
    );
    expect(threeCardSpreadCaptionHtml(['Прошлое: X', 'Настоящее: Y'], 'Луна')).toBe(
      '<b>Прошлое, настоящее, будущее:</b>\n\nПрошлое: X\nНастоящее: Y\n\nТолкователь: «Луна»',
    );
    expect(voiceArchetypeCaptionLineHtml('<Маг>')).toBe('Толкователь: «&lt;Маг&gt;»');
  });

  it('three-card caption with question includes theme line', () => {
    expect(
      threeCardSpreadCaptionWithQuestionHtml('Карьера', ['Прошлое: X', 'Настоящее: Y'], 'Иерофант'),
    ).toContain('Толкователь: «Иерофант»\n\nТема: «Карьера»');
  });

  it('bounded spread caption keeps valid HTML and visible voice', () => {
    const html = threeCardSpreadCaptionWithQuestionHtmlBounded(
      'Очень длинная тема '.repeat(100),
      ['Прошлое: X', 'Настоящее: Y', 'Будущее: Z'],
      'Иерофант',
      180,
    );
    expect(html.length).toBeLessThanOrEqual(180);
    expect(html).toContain('Толкователь: «Иерофант»');
    expect(html.match(/<b>/g)).toHaveLength(html.match(/<\/b>/g)?.length ?? 0);
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
