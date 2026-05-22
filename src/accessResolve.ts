import { userHasPremiumOrAdminSync } from './db/usersRepo.js';

/** Расклад «Прошлое — настоящее — будущее» — Premium или админ. */
export function hasFullSpreadAccess(userId: number | undefined): boolean {
  if (userId === undefined) return false;
  return userHasPremiumOrAdminSync(userId);
}
