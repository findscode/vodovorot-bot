/** Подсказка в intro spread/deep (#56): обрыв сессии без persist. */
export const SESSION_RECOVERY_HINT_HTML =
  'Если гадание оборвалось — открой расклад снова и нажми <b>Начать</b>.';

/** Текст после TTL spread-сессии, когда пользователь шлёт вопрос без «Начать». */
export function spreadSessionLostMessageHtml(spreadTitleHtml: string): string {
  return `Похоже, ${spreadTitleHtml} уже не активен — время ожидания вышло или бот перезапускался.\n\n${SESSION_RECOVERY_HINT_HTML}`;
}
