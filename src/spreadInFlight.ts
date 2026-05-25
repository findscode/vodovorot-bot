const spreadInFlight = new Set<number>();

export function isSpreadInFlight(userId: number): boolean {
  return spreadInFlight.has(userId);
}

/** @returns false если расклад уже готовится */
export function tryMarkSpreadInFlight(userId: number): boolean {
  if (spreadInFlight.has(userId)) return false;
  spreadInFlight.add(userId);
  return true;
}

export function clearSpreadInFlight(userId: number): void {
  spreadInFlight.delete(userId);
}

/** Только для тестов. */
export function clearSpreadInFlightForTests(): void {
  spreadInFlight.clear();
}
