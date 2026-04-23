/** In-memory последнее толкование на пользователя (сырой текст модели); после рестарта процесса пусто. */

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 12_000;

const store = new Map<number, { text: string; expiresAt: number }>();

function pruneExpired(): void {
  const t = Date.now();
  for (const [id, v] of store) {
    if (v.expiresAt <= t) store.delete(id);
  }
}

export function saveLastReading(userId: number, rawReadingPlain: string): void {
  pruneExpired();
  const text =
    rawReadingPlain.length > MAX_TEXT_LENGTH
      ? `${rawReadingPlain.slice(0, MAX_TEXT_LENGTH)}…`
      : rawReadingPlain;
  store.set(userId, { text, expiresAt: Date.now() + TTL_MS });
}

export function getLastReading(userId: number): string | null {
  pruneExpired();
  const v = store.get(userId);
  if (!v) return null;
  if (v.expiresAt <= Date.now()) {
    store.delete(userId);
    return null;
  }
  return v.text;
}
