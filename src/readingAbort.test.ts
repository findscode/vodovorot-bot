import { describe, expect, it, beforeEach } from 'vitest';
import { beginDeepSession } from './deepReading/deepReadingDelivery.js';
import {
  appendTriplet,
  getDeepSession,
  hasActiveDeepSession,
  isCurrentDeepSession,
} from './deepReading/sessionStore.js';
import { abortActiveReadingsSync } from './readingAbort.js';
import { tryMarkDeepInFlight, isDeepInFlight } from './deepInFlight.js';
import {
  beginSpreadSession,
  getSpreadSession,
  hasActiveSpreadSession,
  isCurrentSpreadSession,
} from './spreadSessionStore.js';
import { readingAbortedNoticeHtml } from './botCopy.js';
import type { DrawnCard } from './deck.js';

const uid = 4242;

const stubCard = (id: number): DrawnCard => ({
  card: { id, name: `card-${id}` },
  reversed: false,
});

describe('readingAbort', () => {
  beforeEach(() => {
    abortActiveReadingsSync(uid);
  });

  it('returns null when nothing active', () => {
    expect(abortActiveReadingsSync(uid)).toEqual({ noticeHtml: null });
  });

  it('aborts spread with notice', () => {
    beginSpreadSession(uid, uid);
    const result = abortActiveReadingsSync(uid);
    expect(result.noticeHtml).toBe(readingAbortedNoticeHtml('spread'));
    expect(hasActiveSpreadSession(uid)).toBe(false);
  });

  it('aborts deep with triplets using without-final copy', () => {
    beginDeepSession(uid, uid);
    appendTriplet(
      uid,
      {
        question: 'q',
        cards: [stubCard(1), stubCard(2), stubCard(3)],
        summary: 't',
      },
      [],
      { png: Buffer.from(''), width: 1, height: 1 },
    );
    const result = abortActiveReadingsSync(uid);
    expect(result.noticeHtml).toBe(readingAbortedNoticeHtml('deep_with_triplets'));
    expect(hasActiveDeepSession(uid)).toBe(false);
  });

  it('aborts deep intro with softer copy', () => {
    beginDeepSession(uid, uid);
    const result = abortActiveReadingsSync(uid);
    expect(result.noticeHtml).toBe(readingAbortedNoticeHtml('deep_intro'));
  });

  it('invalidates previous deep session id after restart', () => {
    beginDeepSession(uid, uid);
    const oldId = getDeepSession(uid)!.id;
    expect(tryMarkDeepInFlight(uid)).toBe(true);
    abortActiveReadingsSync(uid);
    expect(isDeepInFlight(uid)).toBe(false);
    beginDeepSession(uid, uid);
    const newId = getDeepSession(uid)!.id;
    expect(newId).not.toBe(oldId);
    expect(isCurrentDeepSession(uid, oldId)).toBe(false);
    expect(isCurrentDeepSession(uid, newId)).toBe(true);
  });

  it('invalidates previous spread session id after restart', () => {
    beginSpreadSession(uid, uid);
    const oldId = getSpreadSession(uid)!.id;
    abortActiveReadingsSync(uid);
    beginSpreadSession(uid, uid);
    const newId = getSpreadSession(uid)!.id;
    expect(newId).not.toBe(oldId);
    expect(isCurrentSpreadSession(uid, oldId)).toBe(false);
    expect(isCurrentSpreadSession(uid, newId)).toBe(true);
  });
});
