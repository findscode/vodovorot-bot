/** Максимум триплетов за сессию (Premium / админ). */
export const DEEP_MAX_TRIPLETS_PREMIUM = 7;

/** Максимум триплетов за сессию (tier `basic`, модель C). */
export const DEEP_MAX_TRIPLETS_BASIC = 3;

/** @deprecated Используй {@link DEEP_MAX_TRIPLETS_PREMIUM} или лимит по tier. */
export const DEEP_MAX_TRIPLETS = DEEP_MAX_TRIPLETS_PREMIUM;

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
