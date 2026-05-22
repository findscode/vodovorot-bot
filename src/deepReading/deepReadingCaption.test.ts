import { describe, expect, it } from 'vitest';
import { deepReadingCaptionHtmlBounded } from './deepReadingCaption.js';

describe('deepReadingCaptionHtmlBounded', () => {
  it('numbers questions, separates with blank line, bolds current, with session header', () => {
    const html = deepReadingCaptionHtmlBounded(['один', 'два'], 1, 1024, 'basic');
    expect(html).toContain('🌱 «Глубинная диагностика»');
    expect(html).toContain('1. «один»');
    expect(html).toContain('<b>2. «два»</b>');
  });

  it('keeps global numbers when oldest questions are trimmed', () => {
    const questions = ['a', 'b', 'c', 'd'];
    const html = deepReadingCaptionHtmlBounded(questions, 3, 1024, 'premium');
    expect(html).toContain('⭐️ «Глубинная диагностика»');
    expect(html).toContain('1. «a»');
    expect(html).toContain('<b>4. «d»</b>');
    expect(html).not.toMatch(/^1\. «b»/);
  });
});
