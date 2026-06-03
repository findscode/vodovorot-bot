const dayInFlight = new Set<number>();

export function isDayInFlight(userId: number): boolean {
  return dayInFlight.has(userId);
}

/** @returns false если «На день» уже готовится */
export function tryMarkDayInFlight(userId: number): boolean {
  if (dayInFlight.has(userId)) return false;
  dayInFlight.add(userId);
  return true;
}

export function clearDayInFlight(userId: number): void {
  dayInFlight.delete(userId);
}

/** Только для тестов. */
export function clearDayInFlightForTests(): void {
  dayInFlight.clear();
}
