import type { DrawnCard, TarotCard } from '../deck.js';
import { DEEP_MAX_TRIPLETS_PREMIUM, DEEP_SESSION_TTL_MS } from './constants.js';

export type DeepSessionPhase =
  | 'intro'
  | 'awaiting_first_question'
  | 'awaiting_clarification'
  | 'in_chain'
  | 'awaiting_final_retry';

export type DeepTripletRecord = {
  question: string;
  cards: [DrawnCard, DrawnCard, DrawnCard];
  summary: string;
};

/** Готовый шаг: карты, толкователь и текст ИИ — чтобы повтор не менял расклад и не звал модель снова. */
export type PendingDeepReading = {
  question: string;
  raw: string;
  drawn: [DrawnCard, DrawnCard, DrawnCard];
  remaining: number[];
  voice: TarotCard;
};

export type DeepSession = {
  /** Уникальный id экземпляра сессии: после abort/restart старый delivery должен выйти. */
  id: number;
  chatId: number;
  phase: DeepSessionPhase;
  deckRemaining: number[];
  triplets: DeepTripletRecord[];
  /** Вопрос, ожидающий повторной отправки после ai_error (триплет не засчитан). */
  pendingQuestion: string | null;
  /**
   * Ответ ИИ уже получен, но сборка фото или отправка не удались: при повторе того же вопроса
   * берём этот текст и не тратим ещё один запрос к модели.
   */
  pendingReading: PendingDeepReading | null;
  /** Исходный первый вопрос на шаге clarity. */
  clarityQuestion: string | null;
  claritySkipNext: boolean;
  lastCompositePng: Buffer | null;
  lastCompositeWidth: number;
  lastCompositeHeight: number;
  updatedAt: number;
};

const sessions = new Map<number, DeepSession>();
let nextDeepSessionId = 1;

function now(): number {
  return Date.now();
}

/** true, если активная сессия всё ещё тот же экземпляр, что при старте delivery. */
export function isCurrentDeepSession(userId: number, sessionId: number): boolean {
  return getDeepSession(userId)?.id === sessionId;
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
    id: nextDeepSessionId++,
    chatId,
    phase: 'intro',
    deckRemaining: deckIds,
    triplets: [],
    pendingQuestion: null,
    pendingReading: null,
    clarityQuestion: null,
    claritySkipNext: false,
    lastCompositePng: null,
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

export function setPendingReading(userId: number, reading: PendingDeepReading | null): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.pendingReading = reading;
  s.updatedAt = now();
}

/** Сохранённый шаг для повтора того же вопроса (после сбоя доставки), иначе `null`. */
export function pendingReadingFor(
  session: DeepSession,
  question: string,
): PendingDeepReading | null {
  const p = session.pendingReading;
  return p !== null && p.question === question ? p : null;
}

export function setDeepClarityQuestion(userId: number, question: string | null): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.clarityQuestion = question;
  s.updatedAt = now();
}

export function setDeepClaritySkipNext(userId: number, skip: boolean): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.claritySkipNext = skip;
  s.updatedAt = now();
}

export function canAddTriplet(
  session: DeepSession,
  maxTriplets: number = DEEP_MAX_TRIPLETS_PREMIUM,
): boolean {
  return session.triplets.length < maxTriplets;
}

export function appendTriplet(
  userId: number,
  record: DeepTripletRecord,
  remainingDeck: number[],
  composite: { png: Buffer; width: number; height: number },
): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.triplets.push(record);
  s.deckRemaining = remainingDeck;
  s.pendingQuestion = null;
  s.pendingReading = null;
  s.lastCompositePng = composite.png;
  s.lastCompositeWidth = composite.width;
  s.lastCompositeHeight = composite.height;
  s.phase = 'in_chain';
  s.updatedAt = now();
}
