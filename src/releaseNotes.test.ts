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
    expect(html).toContain('Прошлое — настоящее — будущее');
    expect(html).toContain('Понятно');
    expect(html).not.toContain('трек');
    expect(html).toContain('одна тема за раз');
    expect(html.match(/^• /gm)).toHaveLength(3);
  });
});
