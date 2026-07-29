import { describe, expect, it } from 'vitest';
import {
  deepSessionBlockedMessageHtml,
  isPublicEntryCommand,
  QUESTION_CLARITY_AWAITING_MESSAGE,
  promoOkMessageHtml,
  readingAbortedNoticeHtml,
  startTextHtml,
} from './botCopy.js';

const basicOpts = { tier: 'basic' as const, unlimitedSpread: false };

describe('botCopy', () => {
  it('deepSessionBlockedMessageHtml gives phase-specific actions', () => {
    expect(deepSessionBlockedMessageHtml('basic', 'intro')).toContain('«Начать»');
    expect(deepSessionBlockedMessageHtml('basic', 'awaiting_first_question')).toContain(
      'Напиши первый вопрос',
    );
    expect(deepSessionBlockedMessageHtml('basic', 'awaiting_clarification')).toContain(
      'кнопку под подсказкой',
    );
    expect(deepSessionBlockedMessageHtml('basic', 'in_chain')).toContain('Закончить гадание');
    expect(deepSessionBlockedMessageHtml('basic', 'in_chain')).not.toMatch(/осталось|сделано \d/i);
  });

  it('clarity waiting copy points to visible buttons', () => {
    expect(QUESTION_CLARITY_AWAITING_MESSAGE).toContain('Уточнить');
    expect(QUESTION_CLARITY_AWAITING_MESSAGE).toContain('Оставить так');
    expect(QUESTION_CLARITY_AWAITING_MESSAGE).not.toContain('Начать');
  });

  it('startText points to Menu and states ethos', () => {
    const html = startTextHtml(basicOpts);
    expect(html).toContain('Меню');
    expect(html).toContain('«На день»');
    expect(html).toContain('«Глубинная диагностика»');
    expect(html).toContain('\n\n');
    expect(html).toContain('Запомни:');
    expect(html).toContain('не гарантия будущего');
    expect(html).not.toContain('/promo');
  });

  it('readingAbortedNoticeHtml matches brand tone for deep without final', () => {
    const html = readingAbortedNoticeHtml('deep_with_triplets');
    expect(html).toContain('без общего вывода');
    expect(html).toContain('прервано');
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

  it('isPublicEntryCommand recognizes start, help', () => {
    expect(isPublicEntryCommand('/start')).toBe(true);
    expect(isPublicEntryCommand('/start@MyBot')).toBe(true);
    expect(isPublicEntryCommand('/menu')).toBe(false);
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
