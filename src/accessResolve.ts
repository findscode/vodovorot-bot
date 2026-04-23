import { userHasPremiumOrAdminSync } from './db/usersRepo.js';
import { getAccessWhitelist } from './runtimeConfig.js';

/** Полный доступ к раскладу «прошлое — настоящее — будущее». */
export function hasFullSpreadAccess(userId: number | undefined): boolean {
  if (userId === undefined) return false;
  const wl = getAccessWhitelist();
  if (wl === null) return true;
  if (wl.has(userId)) return true;
  return userHasPremiumOrAdminSync(userId);
}
