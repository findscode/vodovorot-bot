const deepInFlight = new Set<number>();

export function isDeepInFlight(userId: number): boolean {
  return deepInFlight.has(userId);
}

/** @returns false если триплет deep уже готовится */
export function tryMarkDeepInFlight(userId: number): boolean {
  if (deepInFlight.has(userId)) return false;
  deepInFlight.add(userId);
  return true;
}

export function clearDeepInFlight(userId: number): void {
  deepInFlight.delete(userId);
}

/** Только для тестов. */
export function clearDeepInFlightForTests(): void {
  deepInFlight.clear();
}
