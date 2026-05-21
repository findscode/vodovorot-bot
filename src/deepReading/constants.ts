/** Максимум триплетов за одну сессию глубинной диагностики. */
export const DEEP_MAX_TRIPLETS = 7;

/** TTL сессии без активности (24 ч). */
export const DEEP_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Доля высоты предыдущего коллажа, видимая под новым триплетом (v1). */
export const DEEP_STACK_PEEK_RATIO = 0.15;

/** Макс. сторона JPEG коллажа (подгонка под Telegram). */
export const DEEP_COMPOSITE_MAX_SIDE_PX = 1280;

export const DEEP_CALLBACK = 'deep';
export const DEEP_CANCEL_CALLBACK = 'deep_cancel';
export const DEEP_END_CALLBACK = 'deep_end';

export const DEEP_SUMMARY_MARKER = /^РЕЗЮМЕ:\s*/im;
