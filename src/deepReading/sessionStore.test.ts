import { afterEach, describe, expect, it } from 'vitest';
import { DECK } from '../deck.js';
import { DEEP_MAX_TRIPLETS } from './constants.js';
import {
  appendTriplet,
  canAddTriplet,
  endDeepSession,
  getDeepSession,
  hasActiveDeepSession,
  setDeepPhase,
  setPendingQuestion,
  startDeepSession,
} from './sessionStore.js';

describe('sessionStore', () => {
  const uid = 900_001;
  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  afterEach(() => {
    endDeepSession(uid);
  });

  it('tracks active session', () => {
    expect(hasActiveDeepSession(uid)).toBe(false);
    startDeepSession(uid, uid, [0, 1, 2]);
    expect(hasActiveDeepSession(uid)).toBe(true);
    expect(getDeepSession(uid)?.phase).toBe('intro');
    endDeepSession(uid);
    expect(hasActiveDeepSession(uid)).toBe(false);
  });

  it('appendTriplet stores composite and moves to in_chain', () => {
    startDeepSession(uid, uid, [0, 1, 2, 3, 4, 5]);
    setDeepPhase(uid, 'awaiting_first_question');
    const cards = [
      { card: DECK[0]!, reversed: false },
      { card: DECK[1]!, reversed: false },
      { card: DECK[2]!, reversed: false },
    ] as const;
    appendTriplet(uid, { question: 'Тест?', cards, summary: 'резюме' }, [3, 4, 5], {
      png: fakePng,
      width: 100,
      height: 50,
    });
    const s = getDeepSession(uid);
    expect(s?.phase).toBe('in_chain');
    expect(s?.triplets).toHaveLength(1);
    expect(s?.lastCompositePng).toBe(fakePng);
    expect(s?.lastCompositeWidth).toBe(100);
    expect(s?.pendingQuestion).toBeNull();
    expect(s?.deckRemaining).toEqual([3, 4, 5]);
  });

  it('canAddTriplet respects DEEP_MAX_TRIPLETS', () => {
    startDeepSession(uid, uid, shuffledIds());
    const s = getDeepSession(uid)!;
    expect(canAddTriplet(s)).toBe(true);
    s.triplets = Array.from({ length: DEEP_MAX_TRIPLETS }, (_, i) => ({
      question: `q${i}`,
      cards: [
        { card: DECK[0]!, reversed: false },
        { card: DECK[1]!, reversed: false },
        { card: DECK[2]!, reversed: false },
      ],
      summary: 's',
    }));
    expect(canAddTriplet(s)).toBe(false);
  });

  it('setPendingQuestion and setDeepPhase update session', () => {
    startDeepSession(uid, uid, [0, 1, 2]);
    setPendingQuestion(uid, 'повтор?');
    expect(getDeepSession(uid)?.pendingQuestion).toBe('повтор?');
    setDeepPhase(uid, 'in_chain');
    expect(getDeepSession(uid)?.phase).toBe('in_chain');
    setPendingQuestion(uid, null);
    expect(getDeepSession(uid)?.pendingQuestion).toBeNull();
  });
});

function shuffledIds(): number[] {
  return Array.from({ length: 78 }, (_, i) => i);
}
