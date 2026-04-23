import { describe, expect, it } from 'vitest';
import { escapeTelegramHtml, formatReadingForTelegram } from './readingTelegramHtml.js';
import { splitForTelegram, TG_MAX } from './telegramChunks.js';

describe('readingTelegramHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeTelegramHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
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
