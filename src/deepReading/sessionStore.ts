import type { DrawnCard } from '../deck.js';
import { DEEP_MAX_TRIPLETS, DEEP_SESSION_TTL_MS } from './constants.js';

export type DeepSessionPhase = 'awaiting_first_question' | 'in_chain';

export type DeepTripletRecord = {
  question: string;
  cards: [DrawnCard, DrawnCard, DrawnCard];
  summary: string;
};

export type DeepSession = {
  chatId: number;
  phase: DeepSessionPhase;
  deckRemaining: number[];
  triplets: DeepTripletRecord[];
  /** Вопрос, ожидающий повторной отправки после ai_error (триплет не засчитан). */
  pendingQuestion: string | null;
  lastCompositeJpeg: Buffer | null;
  lastCompositeWidth: number;
  lastCompositeHeight: number;
  updatedAt: number;
};

const sessions = new Map<number, DeepSession>();

function now(): number {
  return Date.now();
}

export function purgeExpiredDeepSessions(): void {
  const t = now();
  for (const [uid, s] of sessions) {
    if (t - s.updatedAt > DEEP_SESSION_TTL_MS) {
      sessions.delete(uid);
    }
  }
}

export function hasActiveDeepSession(userId: number): boolean {
  purgeExpiredDeepSessions();
  return sessions.has(userId);
}

export function getDeepSession(userId: number): DeepSession | undefined {
  purgeExpiredDeepSessions();
  return sessions.get(userId);
}

export function startDeepSession(userId: number, chatId: number, deckIds: number[]): void {
  sessions.set(userId, {
    chatId,
    phase: 'awaiting_first_question',
    deckRemaining: deckIds,
    triplets: [],
    pendingQuestion: null,
    lastCompositeJpeg: null,
    lastCompositeWidth: 0,
    lastCompositeHeight: 0,
    updatedAt: now(),
  });
}

export function endDeepSession(userId: number): void {
  sessions.delete(userId);
}

export function touchDeepSession(userId: number): void {
  const s = sessions.get(userId);
  if (s) s.updatedAt = now();
}

export function setDeepPhase(userId: number, phase: DeepSessionPhase): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.phase = phase;
  s.updatedAt = now();
}

export function setPendingQuestion(userId: number, question: string | null): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.pendingQuestion = question;
  s.updatedAt = now();
}

export function canAddTriplet(session: DeepSession): boolean {
  return session.triplets.length < DEEP_MAX_TRIPLETS;
}

export function appendTriplet(
  userId: number,
  record: DeepTripletRecord,
  remainingDeck: number[],
  composite: { jpeg: Buffer; width: number; height: number },
): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.triplets.push(record);
  s.deckRemaining = remainingDeck;
  s.pendingQuestion = null;
  s.lastCompositeJpeg = composite.jpeg;
  s.lastCompositeWidth = composite.width;
  s.lastCompositeHeight = composite.height;
  s.phase = 'in_chain';
  s.updatedAt = now();
}
