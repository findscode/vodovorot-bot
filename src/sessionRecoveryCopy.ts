/** Подсказка в intro spread/deep (#56): обрыв гадания без сохранения в БД. */
export const SESSION_RECOVERY_HINT_HTML =
  'Если гадание оборвалось — открой расклад в <b>Меню</b> снова.';

/** Текст после TTL spread-сессии, когда пользователь шлёт вопрос без открытого расклада. */
export function spreadSessionLostMessageHtml(spreadTitleHtml: string): string {
  return `Похоже, ${spreadTitleHtml} уже закрыт: ты давно не писал, или бот перезапускался.\n\n${SESSION_RECOVERY_HINT_HTML}`;
}

/** Ответ на кнопку из уже завершённого или потерянного гадания. */
export function staleSessionButtonMessageHtml(): string {
  return `Эта кнопка осталась от прошлого расклада и уже не работает.\n\nОткрой <b>Меню</b> и начни расклад снова.`;
}

/** Текст вопроса без открытого расклада, в том числе после рестарта. */
export function inactiveSessionTextMessageHtml(): string {
  return `Сейчас у меня нет открытого гадания — оно могло закончиться или прерваться при перезапуске.\n\nОткрой <b>Меню</b> и начни расклад снова.`;
}
