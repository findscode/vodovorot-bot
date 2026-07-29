/** Подсказка в intro spread/deep (#56): обрыв сессии без persist. */
export const SESSION_RECOVERY_HINT_HTML =
  'Если гадание оборвалось — открой расклад снова и нажми <b>Начать</b>.';

/** Текст после TTL spread-сессии, когда пользователь шлёт вопрос без «Начать». */
export function spreadSessionLostMessageHtml(spreadTitleHtml: string): string {
  return `Похоже, ${spreadTitleHtml} уже не активен — время ожидания вышло или бот перезапускался.\n\n${SESSION_RECOVERY_HINT_HTML}`;
}

/** Ответ на кнопку из уже завершённой или потерянной сессии. */
export function staleSessionButtonMessageHtml(): string {
  return `Эта кнопка относится к сессии, которая уже завершилась или устарела.\n\nОткрой <b>Меню</b> и начни расклад снова.`;
}

/** Текст вопроса без активной spread/deep-сессии, в том числе после рестарта. */
export function inactiveSessionTextMessageHtml(): string {
  return `Сейчас я не вижу активного гадания. Оно могло завершиться или сброситься после перезапуска.\n\nОткрой <b>Меню</b> и начни расклад снова.`;
}
