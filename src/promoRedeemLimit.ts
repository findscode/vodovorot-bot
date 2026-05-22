import { PROMO_REDEEM_MAX_ATTEMPTS, PROMO_REDEEM_WINDOW_MS } from './promoConfig.js';

type Window = { count: number; startedAt: number };

const byUser = new Map<number, Window>();

/** Сброс лимитов (только тесты). */
export function resetPromoRedeemLimitsForTests(): void {
  byUser.clear();
}

/** Учитывает попытку ввода кода; при превышении лимита — `rate_limited`. */
export function checkPromoRedeemAttempt(userId: number): 'ok' | 'rate_limited' {
  const now = Date.now();
  let w = byUser.get(userId);
  if (!w || now - w.startedAt >= PROMO_REDEEM_WINDOW_MS) {
    w = { count: 0, startedAt: now };
    byUser.set(userId, w);
  }
  if (w.count >= PROMO_REDEEM_MAX_ATTEMPTS) {
    return 'rate_limited';
  }
  w.count += 1;
  return 'ok';
}
