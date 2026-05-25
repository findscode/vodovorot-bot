import { describe, expect, it, beforeEach } from 'vitest';
import { beginDeepSession } from './deepReading/deepReadingDelivery.js';
import { appendTriplet, hasActiveDeepSession } from './deepReading/sessionStore.js';
import { abortActiveReadingsSync } from './readingAbort.js';
import { beginSpreadSession, hasActiveSpreadSession } from './spreadSessionStore.js';
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
});
