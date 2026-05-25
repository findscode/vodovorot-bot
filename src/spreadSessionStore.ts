import { SPREAD_SESSION_TTL_MS } from './spreadConstants.js';

export type SpreadSessionPhase = 'intro' | 'awaiting_question';

export type SpreadSession = {
  chatId: number;
  phase: SpreadSessionPhase;
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
  return getSpreadSession(userId)?.phase === 'awaiting_question';
}

export function beginSpreadSession(userId: number, chatId: number): void {
  purgeExpiredSpreadSessions();
  sessions.set(userId, { chatId, phase: 'intro', updatedAt: now() });
}

export function setSpreadPhase(userId: number, phase: SpreadSessionPhase): void {
  const s = sessions.get(userId);
  if (!s) return;
  s.phase = phase;
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
