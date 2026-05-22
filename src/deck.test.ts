import { describe, expect, it } from 'vitest';
import {
  DECK,
  drawTripletFromRemainingIds,
  formatDrawnLine,
  orientationLabel,
  shuffledDeckIds,
  type DrawnCard,
  type TarotCard,
} from './deck.js';

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

  it('shuffledDeckIds returns 78 unique ids', () => {
    const ids = shuffledDeckIds();
    expect(ids).toHaveLength(78);
    expect(new Set(ids).size).toBe(78);
  });

  it('drawTripletFromRemainingIds removes three ids from pool', () => {
    const remaining = [0, 1, 2, 3, 4];
    const { drawn, remaining: rest } = drawTripletFromRemainingIds(remaining);
    expect(drawn).toHaveLength(3);
    expect(rest).toHaveLength(2);
    const drawnIds = drawn.map((d) => d.card.id);
    for (const id of drawnIds) {
      expect(remaining).toContain(id);
      expect(rest).not.toContain(id);
    }
  });

  it('drawTripletFromRemainingIds throws when fewer than three cards left', () => {
    expect(() => drawTripletFromRemainingIds([0, 1])).toThrow(/меньше трёх/);
  });
});
