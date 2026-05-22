/** Максимум триплетов за одну сессию глубинной диагностики. */
export const DEEP_MAX_TRIPLETS = 7;

/** TTL сессии без активности (24 ч). */
export const DEEP_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Смещение нового триплета вниз поверх предыдущего (доля высоты карты на полосе, ~10–15%). */
export const DEEP_STRIP_STACK_OFFSET_FRACTION = 0.125;

/** Макс. сторона JPEG коллажа (подгонка под Telegram). */
export const DEEP_COMPOSITE_MAX_SIDE_PX = 1280;

export const DEEP_CALLBACK = 'deep';
export const DEEP_START_CALLBACK = 'deep_start';
export const DEEP_CANCEL_CALLBACK = 'deep_cancel';
export const DEEP_END_CALLBACK = 'deep_end';

export const DEEP_SUMMARY_MARKER = /^РЕЗЮМЕ:\s*/im;
