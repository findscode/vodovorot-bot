import { SPREAD_SESSION_TTL_MS } from './spreadConstants.js';

export type SpreadSessionPhase = 'intro' | 'awaiting_question' | 'awaiting_clarification';

export type SpreadSession = {
  chatId: number;
  phase: SpreadSessionPhase;
  /** Исходный вопрос, пока ждём «Уточнить» / «Оставить так». */
  clarityQuestion: string | null;
  /** Следующий текст вопроса без повторной проверки clarity. */
  claritySkipNext: boolean;
  updatedAt: number;
};

const sessions = new Map<number, SpreadSession>();

function now(): number {
  return Date.now();
}

export function purgeExpiredSpreadSessions(): void {
  const t = now();
  for (const [uid, s] of sessions) {
    if (t - s.updatedAt > SPREAD_SESSION_TTL_MS) {
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
  sessions.set(userId, {
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
  sessions.delete(userId);
}

/** Только для тестов. */
export function clearSpreadSessionsForTests(): void {
  sessions.clear();
}
