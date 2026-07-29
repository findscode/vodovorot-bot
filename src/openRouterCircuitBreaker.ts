/** Пауза всех запросов к OpenRouter после исчерпания квоты / волны 429. */

export const OPENROUTER_CIRCUIT_COOLDOWN_MS = 15 * 60 * 1000;

let openUntilMs = 0;

export function isOpenRouterCircuitOpen(nowMs: number = Date.now()): boolean {
  return nowMs < openUntilMs;
}

export function tripOpenRouterCircuit(nowMs: number = Date.now()): void {
  openUntilMs = Math.max(openUntilMs, nowMs + OPENROUTER_CIRCUIT_COOLDOWN_MS);
}

export function clearOpenRouterCircuit(): void {
  openUntilMs = 0;
}

/** Только для тестов. */
export function resetOpenRouterCircuitForTests(): void {
  openUntilMs = 0;
}
