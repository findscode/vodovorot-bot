import { describe, expect, it } from 'vitest';
import { deepSessionBlockedMessageHtml, isPublicEntryCommand } from './botCopy.js';

describe('botCopy', () => {
  it('deepSessionBlockedMessageHtml explains blocked state without counters', () => {
    const html = deepSessionBlockedMessageHtml();
    expect(html).toContain('глубинная диагностика');
    expect(html).not.toMatch(/осталось|сделано \d/i);
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
