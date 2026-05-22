/** Парсинг списка Telegram user id из env (запятая, пробел, `;`). */
const SPLIT_RE = /[\s,;]+/;

export function parseTelegramUserIdsFromEnv(raw: string): Set<number> {
  const ids = new Set<number>();
  for (const part of raw.trim().split(SPLIT_RE).filter(Boolean)) {
    if (!/^\d+$/.test(part)) {
      throw new Error(
        `Недопустимый фрагмент «${part}» (нужны положительные целые id через запятую, пробел или ;).`,
      );
    }
    const n = Number(part);
    if (!Number.isSafeInteger(n) || n <= 0) {
      throw new Error(`id вне допустимого диапазона: ${part}`);
    }
    ids.add(n);
  }
  if (ids.size === 0) {
    throw new Error('Не удалось прочитать ни одного числового user id.');
  }
  return ids;
}
