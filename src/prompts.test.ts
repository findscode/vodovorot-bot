import { describe, expect, it } from 'vitest';
import { cardOfDayPrompt, pastPresentFuturePrompt } from './prompts.js';
import { deepBasicFinalPrompt, deepFinalPrompt, deepTripletPrompt } from './deepReading/prompts.js';
import { SAFETY_HINT, SAFETY_HINT_KEY_PHRASES } from './safetyHint.js';
import { DISCLAIMER_HELP } from './botCopy.js';
import type { DrawnCard } from './deck.js';

const stubCard = (name: string, id = 1): DrawnCard => ({
  card: { id, name },
  reversed: false,
});

describe('SAFETY_HINT', () => {
  it('contains key phrases for regression', () => {
    for (const phrase of SAFETY_HINT_KEY_PHRASES) {
      expect(SAFETY_HINT).toContain(phrase);
    }
  });
});

describe('prompt safety blocks', () => {
  const cards = [stubCard('Маг', 1), stubCard('Луна', 18), stubCard('Солнце', 19)] as [
    DrawnCard,
    DrawnCard,
    DrawnCard,
  ];
  const voice = { id: 5, name: 'Иерофант' };

  it('includes SAFETY_HINT in day, spread, and deep prompts', () => {
    expect(cardOfDayPrompt(stubCard('Звезда', 17), voice)).toContain(SAFETY_HINT);
    expect(pastPresentFuturePrompt(cards, voice, 'Тест?')).toContain(SAFETY_HINT);
    expect(deepTripletPrompt('Тест?', cards, [], voice)).toContain(SAFETY_HINT);
    expect(deepFinalPrompt(['Q'], ['S'])).toContain(SAFETY_HINT);
    expect(deepBasicFinalPrompt(['Q'], ['S'])).toContain(SAFETY_HINT);
    expect(deepBasicFinalPrompt(['Q'], ['S'])).toMatch(/короткий общий вывод/i);
  });

  it('uses visible voice without the old hidden-mask instruction', () => {
    const prompt = cardOfDayPrompt(stubCard('Звезда', 17), voice);
    expect(prompt).toContain('Толкователь — старший аркан «Иерофант»');
    expect(prompt).toContain('его имя уже указано в подписи');
    expect(prompt).not.toMatch(/не называй маску|невидимая маска/i);
    expect(prompt).toContain('Не пиши ничего до первой метки');
  });
});

describe('DISCLAIMER_HELP alignment', () => {
  it('matches safety tone in help disclaimer', () => {
    expect(DISCLAIMER_HELP).toMatch(/ориентир/i);
    expect(DISCLAIMER_HELP).toMatch(/не приговор/i);
    expect(DISCLAIMER_HELP).toMatch(/не заменяет/i);
  });
});

describe('pastPresentFuturePrompt', () => {
  it('includes user question verbatim', () => {
    const cards = [stubCard('Маг', 1), stubCard('Луна', 18), stubCard('Солнце', 19)] as [
      DrawnCard,
      DrawnCard,
      DrawnCard,
    ];
    const prompt = pastPresentFuturePrompt(
      cards,
      { id: 5, name: 'Иерофант' },
      'Что меня ждёт в работе?',
    );
    expect(prompt).toContain('«Что меня ждёт в работе?»');
    expect(prompt).toContain('свяжи каждую позицию с вопросом пользователя');
  });
});
