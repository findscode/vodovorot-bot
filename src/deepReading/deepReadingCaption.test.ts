import { describe, expect, it } from 'vitest';
import { deepReadingCaptionHtmlBounded } from './deepReadingCaption.js';

describe('deepReadingCaptionHtmlBounded', () => {
  it('bolds current question only', () => {
    const html = deepReadingCaptionHtmlBounded(['один', 'два'], 1, 1024);
    expect(html).toContain('«один»');
    expect(html).toContain('<b>«два»</b>');
  });
});
