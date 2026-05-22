import { afterEach, describe, expect, it } from 'vitest';
import { PROMO_REDEEM_MAX_ATTEMPTS } from './promoConfig.js';
import { checkPromoRedeemAttempt, resetPromoRedeemLimitsForTests } from './promoRedeemLimit.js';

describe('promoRedeemLimit', () => {
  afterEach(() => {
    resetPromoRedeemLimitsForTests();
  });

  it('allows attempts up to max then rate limits', () => {
    const uid = 555;
    for (let i = 0; i < PROMO_REDEEM_MAX_ATTEMPTS; i++) {
      expect(checkPromoRedeemAttempt(uid)).toBe('ok');
    }
    expect(checkPromoRedeemAttempt(uid)).toBe('rate_limited');
  });
});
