/** Глобальная очередь запросов к OpenRouter (free-tier ~20 RPM). */

const MIN_GAP_MS = 3_200;

let tail: Promise<unknown> = Promise.resolve();
let lastFinishMs = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Сериализует вызовы и выдерживает паузу между HTTP-запросами к OpenRouter. */
export function withOpenRouterRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const wait = Math.max(0, lastFinishMs + MIN_GAP_MS - Date.now());
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      lastFinishMs = Date.now();
    }
  };
  const result = tail.then(run, run);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Сброс очереди (тесты). */
export function resetOpenRouterRequestGateForTests(): void {
  tail = Promise.resolve();
  lastFinishMs = 0;
}
