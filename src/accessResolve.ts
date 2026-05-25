import { userHasPremiumOrAdminSync } from './db/usersRepo.js';
import { countSpreadDrawsForUserOnDaySync } from './db/spreadDrawSlotsRepo.js';
import { dayDrawCalendarDate } from './dayDrawState.js';
import { SPREAD_MAX_FOR_BASIC } from './spreadConstants.js';

/** Premium или админ — расклад «три карты» без лимита. */
export function hasUnlimitedSpreadAccess(userId: number | undefined): boolean {
  if (userId === undefined) return false;
  return userHasPremiumOrAdminSync(userId);
}

/** @deprecated Используй {@link hasUnlimitedSpreadAccess}. */
export const hasFullSpreadAccess = hasUnlimitedSpreadAccess;

/** Можно начать новый расклад «три карты» (basic — до трёх за календарные сутки). */
export function canUseSpread(userId: number | undefined, at: Date = new Date()): boolean {
  if (userId === undefined) return false;
  if (hasUnlimitedSpreadAccess(userId)) return true;
  const dayKey = dayDrawCalendarDate(at);
  return countSpreadDrawsForUserOnDaySync(userId, dayKey) < SPREAD_MAX_FOR_BASIC;
}

/** Оставшиеся расклады basic за сегодня (null, если unlimited). */
export function remainingSpreadDrawsForUser(userId: number, at: Date = new Date()): number | null {
  if (hasUnlimitedSpreadAccess(userId)) return null;
  const dayKey = dayDrawCalendarDate(at);
  return Math.max(0, SPREAD_MAX_FOR_BASIC - countSpreadDrawsForUserOnDaySync(userId, dayKey));
}
