import { describe, expect, it } from 'vitest';
import { PROMO_SECRET_ALPHABET, PROMO_SECRET_LENGTH } from './promoConfig.js';
import { generateTarotPromoCode, randomPromoSecret } from './promoCodeGenerator.js';

describe('generateTarotPromoCode', () => {
  it('returns tarot prefix plus cryptographically random suffix', () => {
    for (let i = 0; i < 40; i++) {
      const code = generateTarotPromoCode();
      const parts = code.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      const secret = parts[parts.length - 1]!;
      expect(secret).toHaveLength(PROMO_SECRET_LENGTH);
      expect(secret).toMatch(new RegExp(`^[${PROMO_SECRET_ALPHABET}]+$`));
      expect(code.length).toBeLessThanOrEqual(48);
    }
  });

  it('suffixes vary strongly across samples', () => {
    const suffixes = new Set(
      Array.from({ length: 80 }, () => {
        const code = generateTarotPromoCode();
        return code.split('-').pop();
      }),
    );
    expect(suffixes.size).toBeGreaterThan(70);
  });

  it('randomPromoSecret uses only promo alphabet', () => {
    const s = randomPromoSecret(8);
    expect(s).toHaveLength(8);
    for (const ch of s) {
      expect(PROMO_SECRET_ALPHABET.includes(ch)).toBe(true);
    }
  });
});
