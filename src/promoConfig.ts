/** Срок Premium по одноразовому промокоду (фокус-группа, ручная выдача). */
export const PROMO_PREMIUM_DAYS = 31;

/**
 * Криптостойкая часть кода (после таро-префикса).
 * 6 символов из 32-символьного алфавита ≈ 30 бит (~1e9 вариантов на префикс);
 * перебор словарём таро без секрета бесполезен.
 */
export const PROMO_SECRET_LENGTH = 6;

/** Без O/0/I/1 — удобнее читать и диктовать. */
export const PROMO_SECRET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Лимит попыток /promo на пользователя (скользящее окно). */
export const PROMO_REDEEM_MAX_ATTEMPTS = 10;
export const PROMO_REDEEM_WINDOW_MS = 15 * 60 * 1000;
