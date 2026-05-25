import { describe, expect, it } from 'vitest';
import { APP_RELEASE_VERSION, shouldShowWhatsNew, whatsNewHtml } from './releaseNotes.js';

describe('releaseNotes', () => {
  it('shouldShowWhatsNew when last seen differs from app version', () => {
    expect(shouldShowWhatsNew(null)).toBe(true);
    expect(shouldShowWhatsNew('3.6.3')).toBe(true);
    expect(shouldShowWhatsNew(APP_RELEASE_VERSION)).toBe(false);
  });

  it('whatsNewHtml is short user-facing HTML', () => {
    const html = whatsNewHtml();
    expect(html).toContain('<b>Что нового</b>');
    expect(html).toContain('Меню');
    expect(html).toContain('Понятно');
    expect(html).toContain('/promo');
    expect(html.match(/^• /gm)).toHaveLength(3);
  });
});
