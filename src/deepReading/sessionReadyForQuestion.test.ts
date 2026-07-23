import { afterEach, describe, expect, it } from 'vitest';
import { sessionReadyForQuestion } from './deepReadingDelivery.js';
import { endDeepSession, getDeepSession, setDeepPhase, startDeepSession } from './sessionStore.js';

describe('sessionReadyForQuestion', () => {
  const uid = 900_042;

  afterEach(() => {
    endDeepSession(uid);
  });

  it('allows first question and in_chain only', () => {
    startDeepSession(uid, uid, [0, 1, 2]);
    const s = getDeepSession(uid)!;
    expect(sessionReadyForQuestion(s)).toBe(false);
    setDeepPhase(uid, 'awaiting_first_question');
    expect(sessionReadyForQuestion(getDeepSession(uid)!)).toBe(true);
    setDeepPhase(uid, 'in_chain');
    expect(sessionReadyForQuestion(getDeepSession(uid)!)).toBe(true);
    setDeepPhase(uid, 'awaiting_final_retry');
    expect(sessionReadyForQuestion(getDeepSession(uid)!)).toBe(false);
    setDeepPhase(uid, 'awaiting_clarification');
    expect(sessionReadyForQuestion(getDeepSession(uid)!)).toBe(false);
  });
});
