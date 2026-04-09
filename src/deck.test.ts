import { describe, expect, it } from 'vitest';
import { DECK, formatDrawnLine, orientationLabel, type DrawnCard, type TarotCard } from './deck.js';

describe('deck', () => {
  it('has 78 cards (22 major + 56 minor)', () => {
    expect(DECK).toHaveLength(78);
  });

  it('formatDrawnLine shows orientation only when reversed', () => {
    const card: TarotCard = { id: 0, name: 'Шут' };
    const upright: DrawnCard = { card, reversed: false };
    const rev: DrawnCard = { card, reversed: true };
    expect(formatDrawnLine(upright)).toBe('Шут');
    expect(formatDrawnLine(rev)).toBe('Шут (перевёрнутая)');
  });

  it('orientationLabel matches reversed flag', () => {
    expect(orientationLabel(false)).toBe('прямая');
    expect(orientationLabel(true)).toBe('перевёрнутая');
  });
});
