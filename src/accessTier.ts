import { canUseSpread as canUseSpreadFromResolve } from './accessResolve.js';
import { userIsAdminSync, userHasActivePremiumSync } from './db/usersRepo.js';
import { DEEP_MAX_TRIPLETS_BASIC, DEEP_MAX_TRIPLETS_PREMIUM } from './deepReading/constants.js';

/** Уровень доступа (модель C): `basic` | `premium` | `admin`. */
export type AccessTier = 'admin' | 'premium' | 'basic';

export function resolveAccessTier(userId: number | undefined): AccessTier {
  if (userId === undefined) return 'basic';
  if (userIsAdminSync(userId)) return 'admin';
  if (userHasActivePremiumSync(userId)) return 'premium';
  return 'basic';
}

export function deepMaxTripletsForTier(tier: AccessTier): number {
  return tier === 'basic' ? DEEP_MAX_TRIPLETS_BASIC : DEEP_MAX_TRIPLETS_PREMIUM;
}

/** Есть общий финал deep (короткий на basic, полный на premium/admin). */
export function canUseDeepFinal(_tier: AccessTier): boolean {
  return true;
}

/** Полный финал по всей сессии (до 7 триплетов). */
export function isFullDeepFinal(tier: AccessTier): boolean {
  return tier !== 'basic';
}

/** @deprecated Используй {@link isFullDeepFinal}. */
export function canUseFullDeepFinal(tier: AccessTier): boolean {
  return isFullDeepFinal(tier);
}

/** @deprecated Импортируй {@link canUseSpread} из `accessResolve.js`. */
export function canUseSpread(userId: number | undefined): boolean {
  return canUseSpreadFromResolve(userId);
}

/** Premium или админ — расклад «три карты» без лимита. */
export function spreadUnlimitedForTier(tier: AccessTier): boolean {
  return tier !== 'basic';
}

/** Подпись tier для админских команд (латиница, как в коде). */
export function tierLabelForAdmin(tier: AccessTier): string {
  return tier;
}
