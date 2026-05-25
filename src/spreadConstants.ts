/** TTL сессии расклада «три карты» без активности (15 мин). */
export const SPREAD_SESSION_TTL_MS = 15 * 60 * 1000;

/** Сколько раз basic может получить расклад «три карты» за календарные сутки. */
export const SPREAD_MAX_FOR_BASIC = 3;

export const SPREAD_CALLBACK = 'spread';
export const SPREAD_START_CALLBACK = 'spread_start';
export const SPREAD_CANCEL_CALLBACK = 'spread_cancel';
