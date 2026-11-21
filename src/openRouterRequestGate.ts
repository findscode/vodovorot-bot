/**
 * Глобальный лимит частоты запросов к OpenRouter (free-tier ~20 RPM).
 * Выдерживаем паузу между **стартами** запросов; сами запросы идут параллельно,
 * иначе один долгий ответ блокирует всех остальных пользователей.
 */

const MIN_GAP_MS = 3_200;

let nextStartMs = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Резервирует слот старта (не раньше, чем через `MIN_GAP_MS` после предыдущего) и запускает `fn`. */
export async function withOpenRouterRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const startAt = Math.max(now, nextStartMs);
  nextStartMs = startAt + MIN_GAP_MS;
  const wait = startAt - now;
  if (wait > 0) await sleep(wait);
  return fn();
}

/** Сброс очереди (тесты). */
export function resetOpenRouterRequestGateForTests(): void {
  nextStartMs = 0;
}
