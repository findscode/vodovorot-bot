/** Максимум триплетов за одну сессию глубинной диагностики. */
export const DEEP_MAX_TRIPLETS = 7;

/** TTL сессии без активности (24 ч). */
export const DEEP_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Зазор между полосами триплетов в накопительном коллаже. */
export const DEEP_STRIP_STACK_GAP_PX = 12;

/** Макс. сторона JPEG коллажа (подгонка под Telegram). */
export const DEEP_COMPOSITE_MAX_SIDE_PX = 1280;

export const DEEP_CALLBACK = 'deep';
export const DEEP_CANCEL_CALLBACK = 'deep_cancel';
export const DEEP_END_CALLBACK = 'deep_end';

export const DEEP_SUMMARY_MARKER = /^РЕЗЮМЕ:\s*/im;
