import { afterEach, describe, expect, it } from 'vitest';
import {
  endDeepSession,
  getDeepSession,
  hasActiveDeepSession,
  startDeepSession,
} from './sessionStore.js';

describe('sessionStore', () => {
  const uid = 900_001;

  afterEach(() => {
    endDeepSession(uid);
  });

  it('tracks active session', () => {
    expect(hasActiveDeepSession(uid)).toBe(false);
    startDeepSession(uid, uid, [0, 1, 2]);
    expect(hasActiveDeepSession(uid)).toBe(true);
    expect(getDeepSession(uid)?.phase).toBe('awaiting_first_question');
    endDeepSession(uid);
    expect(hasActiveDeepSession(uid)).toBe(false);
  });
});
