import { describe, expect, it } from 'vitest';
import {
  deepSessionBlockedMessageHtml,
  isPublicEntryCommand,
  menuTextHtml,
  promoOkMessageHtml,
  startTextHtml,
} from './botCopy.js';

const basicOpts = { tier: 'basic' as const, unlimitedSpread: false };

describe('botCopy', () => {
  it('deepSessionBlockedMessageHtml explains blocked state without counters', () => {
    const html = deepSessionBlockedMessageHtml('basic');
    expect(html).toContain('«Глубинная диагностика»');
    expect(html).not.toMatch(/осталось|сделано \d/i);
  });

  it('startText points to buttons and states ethos', () => {
    const html = startTextHtml(basicOpts);
    expect(html).toContain('от простых к сложным');
    expect(html).toContain('«На день»');
    expect(html).toContain('«Глубинная диагностика»');
    expect(html).toContain('\n\n');
    expect(html).toContain('Запомни:');
    expect(html).toContain('не гарантия будущего');
    expect(html).not.toContain('/promo');
  });

  it('menuText lists spreads with emoji and quotes', () => {
    const html = menuTextHtml(basicOpts);
    expect(html).toContain('<b>Расклады</b>');
    expect(html).toContain('🌱');
    expect(html).toContain('⭐️');
    expect(html).toContain('«На день»');
  });

  it('promoOkMessageHtml confirms premium with date', () => {
    const html = promoOkMessageHtml(new Date('2026-06-01T12:00:00.000Z'));
    expect(html).toContain('Готово');
    expect(html).toContain('Premium');
  });

  it('PROMO_HELP_HTML is short and points to organizer message', async () => {
    const { PROMO_HELP_HTML } = await import('./botCopy.js');
    expect(PROMO_HELP_HTML).toContain('<b>Промокод</b>');
    expect(PROMO_HELP_HTML).toContain('администратора');
    expect(PROMO_HELP_HTML).toContain('Перешли');
    expect(PROMO_HELP_HTML).not.toMatch(/ТВОЙ-КОД|STAR-LANTERN|не этот|организатор/i);
    expect(PROMO_HELP_HTML).not.toContain('/promo');
    expect(PROMO_HELP_HTML).not.toContain('/status');
  });

  it('isPublicEntryCommand recognizes start, menu, help', () => {
    expect(isPublicEntryCommand('/start')).toBe(true);
    expect(isPublicEntryCommand('/start@MyBot')).toBe(true);
    expect(isPublicEntryCommand('/menu')).toBe(true);
    expect(isPublicEntryCommand('/help')).toBe(true);
    expect(isPublicEntryCommand('/help payload')).toBe(true);
    expect(isPublicEntryCommand('/promo')).toBe(true);
    expect(isPublicEntryCommand('/promo ABC')).toBe(true);
    expect(isPublicEntryCommand('/promo@MyBot')).toBe(true);
    expect(isPublicEntryCommand('/status')).toBe(true);
    expect(isPublicEntryCommand('/status@MyBot')).toBe(true);
    expect(isPublicEntryCommand('/pushtime')).toBe(true);
    expect(isPublicEntryCommand('/pushtime@MyBot')).toBe(true);
    expect(isPublicEntryCommand('hello')).toBe(false);
    expect(isPublicEntryCommand(undefined)).toBe(false);
  });
});
