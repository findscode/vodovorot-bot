import {
  getDeepSession,
  endDeepSession,
  hasActiveDeepSession,
} from './deepReading/sessionStore.js';
import { endSpreadSession, hasActiveSpreadSession } from './spreadSessionStore.js';
import { clearSpreadInFlight } from './spreadInFlight.js';
import { clearDeepInFlight } from './deepInFlight.js';
import { readingAbortedNoticeHtml, type ReadingAbortKind } from './botCopy.js';

export type ReadingAbortResult = {
  noticeHtml: string | null;
};

/** Завершает активную spread/deep-сессию перед новым запуском из App (#4.4). */
export function abortActiveReadingsSync(userId: number): ReadingAbortResult {
  const notices: ReadingAbortKind[] = [];

  if (hasActiveSpreadSession(userId)) {
    endSpreadSession(userId);
    clearSpreadInFlight(userId);
    notices.push('spread');
  }

  if (hasActiveDeepSession(userId)) {
    const session = getDeepSession(userId);
    const kind: ReadingAbortKind =
      session && session.triplets.length > 0 ? 'deep_with_triplets' : 'deep_intro';
    endDeepSession(userId);
    clearDeepInFlight(userId);
    notices.push(kind);
  } else {
    clearDeepInFlight(userId);
  }

  if (notices.length === 0) {
    return { noticeHtml: null };
  }

  const primary = notices.find((k) => k === 'deep_with_triplets') ?? notices[0]!;
  return { noticeHtml: readingAbortedNoticeHtml(primary) };
}
