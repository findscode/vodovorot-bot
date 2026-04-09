import { describe, expect, it } from 'vitest';
import { escapeTelegramHtml, formatReadingForTelegram } from './readingTelegramHtml.js';

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
});
