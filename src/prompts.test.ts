import { describe, expect, it } from 'vitest';
import { pastPresentFuturePrompt } from './prompts.js';
import type { DrawnCard } from './deck.js';

const stubCard = (name: string, id = 1): DrawnCard => ({
  card: { id, name },
  reversed: false,
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
    expect(prompt).toContain('отталкивайся от вопроса пользователя');
  });
});
