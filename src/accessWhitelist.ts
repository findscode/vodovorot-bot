/**
 * Опциональный whitelist Telegram user id: переменная ALLOWED_TELEGRAM_USER_IDS.
 * Пусто или не задана — бот принимает всех (режим «как раньше»).
 */

const SPLIT_RE = /[\s,;]+/;

export function parseAllowlistFromEnvString(raw: string): Set<number> {
  const ids = new Set<number>();
  for (const part of raw.trim().split(SPLIT_RE).filter(Boolean)) {
    if (!/^\d+$/.test(part)) {
      throw new Error(
        `ALLOWED_TELEGRAM_USER_IDS: недопустимый фрагмент «${part}» (нужны положительные целые id через запятую, пробел или ;).`,
      );
    }
    const n = Number(part);
    if (!Number.isSafeInteger(n) || n <= 0) {
      throw new Error(`ALLOWED_TELEGRAM_USER_IDS: id вне допустимого диапазона: ${part}`);
    }
    ids.add(n);
  }
  if (ids.size === 0) {
    throw new Error(
      'ALLOWED_TELEGRAM_USER_IDS задан, но не удалось прочитать ни одного числового id.',
    );
  }
  return ids;
}

/** Полный доступ (все расклады): whitelist выключен или пользователь в списке. */
export function hasFullBotAccess(
  whitelist: Set<number> | null,
  userId: number | undefined,
): boolean {
  if (userId === undefined) return false;
  if (whitelist === null) return true;
  return whitelist.has(userId);
}

/** `null` — whitelist выключен, все пользователи допускаются. */
export function loadOptionalAccessWhitelist(): Set<number> | null {
  const raw = process.env.ALLOWED_TELEGRAM_USER_IDS;
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return parseAllowlistFromEnvString(raw);
}
