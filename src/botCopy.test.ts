import { describe, expect, it } from 'vitest';
import {
  deepSessionBlockedMessageHtml,
  isPublicEntryCommand,
  menuTextHtml,
  promoOkMessageHtml,
  startTextHtml,
} from './botCopy.js';

describe('botCopy', () => {
  it('deepSessionBlockedMessageHtml explains blocked state without counters', () => {
    const html = deepSessionBlockedMessageHtml();
    expect(html).toContain('глубинная диагностика');
    expect(html).not.toMatch(/осталось|сделано \d/i);
  });

  it('startText points to buttons and states ethos', () => {
    expect(startTextHtml()).toContain('от простых к сложным');
    expect(startTextHtml()).toContain('Запомни:');
    expect(startTextHtml()).toContain('не гарантия будущего');
    expect(startTextHtml()).toContain('/promo');
  });

  it('menuText explains basic and premium tracks', () => {
    expect(menuTextHtml()).toContain('🌱');
    expect(menuTextHtml()).toContain('⭐️');
  });

  it('promoOkMessageHtml confirms premium with date', () => {
    const html = promoOkMessageHtml(new Date('2026-06-01T12:00:00.000Z'));
    expect(html).toContain('Готово');
    expect(html).toContain('Premium');
  });

  it('isPublicEntryCommand recognizes start, menu, help', () => {
    expect(isPublicEntryCommand('/start')).toBe(true);
    expect(isPublicEntryCommand('/start@MyBot')).toBe(true);
    expect(isPublicEntryCommand('/menu')).toBe(true);
    expect(isPublicEntryCommand('/help')).toBe(true);
    expect(isPublicEntryCommand('/help payload')).toBe(true);
    expect(isPublicEntryCommand('/last')).toBe(true);
    expect(isPublicEntryCommand('/last@MyBot')).toBe(true);
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
