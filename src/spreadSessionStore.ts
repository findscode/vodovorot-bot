import { SPREAD_SESSION_TTL_MS } from './spreadConstants.js';

/** Сколько после TTL spread ждём «осиротевший» вопрос пользователя (#56). */
export const SPREAD_ORPHAN_HINT_TTL_MS = 30 * 60 * 1000;

export type SpreadSessionPhase = 'intro' | 'awaiting_question' | 'awaiting_clarification';

export type SpreadSession = {
  /** Уникальный id экземпляра сессии: после abort/restart старый delivery должен выйти. */
  id: number;
  chatId: number;
  phase: SpreadSessionPhase;
  /** Исходный вопрос, пока ждём «Уточнить» / «Оставить так». */
  clarityQuestion: string | null;
  /** Следующий текст вопроса без повторной проверки clarity. */
  claritySkipNext: boolean;
  updatedAt: number;
};

const sessions = new Map<number, SpreadSession>();
const spreadOrphanHints = new Map<number, number>();
let nextSpreadSessionId = 1;

/** true, если активная сессия всё ещё тот же экземпляр, что при старте delivery. */
export function isCurrentSpreadSession(userId: number, sessionId: number): boolean {
  return getSpreadSession(userId)?.id === sessionId;
}

function maybeMarkSpreadOrphan(userId: number, phase: SpreadSessionPhase): void {
  if (phase === 'awaiting_question' || phase === 'awaiting_clarification') {
    spreadOrphanHints.set(userId, Date.now());
  }
}

function purgeExpiredOrphanHints(): void {
  const t = now();
  for (const [uid, markedAt] of spreadOrphanHints) {
    if (t - markedAt > SPREAD_ORPHAN_HINT_TTL_MS) {
      spreadOrphanHints.delete(uid);
    }
  }
}

/** Следующий текст пользователя трактуем как «вопрос без сессии» (#56). */
export function consumeSpreadOrphanHint(userId: number): boolean {
  purgeExpiredOrphanHints();
  const markedAt = spreadOrphanHints.get(userId);
  if (markedAt === undefined) return false;
  spreadOrphanHints.delete(userId);
  return now() - markedAt <= SPREAD_ORPHAN_HINT_TTL_MS;
}

export function clearSpreadOrphanHint(userId: number): void {
  spreadOrphanHints.delete(userId);
}

function now(): number {
  return Date.now();
}

export function purgeExpiredSpreadSessions(): void {
  const t = now();
  for (const [uid, s] of sessions) {
    if (t - s.updatedAt > SPREAD_SESSION_TTL_MS) {
      maybeMarkSpreadOrphan(uid, s.phase);
      sessions.delete(uid);
    }
  }
}

export function getSpreadSession(userId: number): SpreadSession | undefined {
  purgeExpiredSpreadSessions();
  return sessions.get(userId);
}

export function hasActiveSpreadSession(userId: number): boolean {
  return getSpreadSession(userId) !== undefined;
}

export function hasSpreadAwaitingQuestion(userId: number): boolean {
  const phase = getSpreadSession(userId)?.phase;
  return phase === 'awaiting_question' || phase === 'awaiting_clarification';
}

export function beginSpreadSession(userId: number, chatId: number): void {
  purgeExpiredSpreadSessions();
  clearSpreadOrphanHint(userId);
  sessions.set(userId, {
    id: nextSpreadSessionId++,
    chatId,
    phase: 'intro',
    clarityQuestion: null,
    claritySkipNext: false,
    updatedAt: now(),
  });
}

export function setSpreadPhase(userId: number, phase: SpreadSessionPhase): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.phase = phase;
  s.updatedAt = now();
}

export function setSpreadClarityQuestion(userId: number, question: string | null): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.clarityQuestion = question;
  s.updatedAt = now();
}

export function setSpreadClaritySkipNext(userId: number, skip: boolean): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.claritySkipNext = skip;
  s.updatedAt = now();
}

export function touchSpreadSession(userId: number): void {
  const s = sessions.get(userId);
  if (s) s.updatedAt = now();
}

export function endSpreadSession(userId: number): void {
  clearSpreadOrphanHint(userId);
  sessions.delete(userId);
}

/** Только для тестов. */
export function clearSpreadSessionsForTests(): void {
  sessions.clear();
  spreadOrphanHints.clear();
}
