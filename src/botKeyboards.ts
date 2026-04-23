import { Markup } from 'telegraf';
import { hasFullSpreadAccess } from './accessResolve.js';
import { isDayPushEnabledSync } from './db/usersRepo.js';

export function keyboardMainOrDayOnly(userId: number | undefined) {
  const full = hasFullSpreadAccess(userId);
  return full
    ? Markup.inlineKeyboard([
        [Markup.button.callback('На день', 'day')],
        [Markup.button.callback('Прошлое — настоящее — будущее', 'spread')],
      ])
    : Markup.inlineKeyboard([[Markup.button.callback('На день', 'day')]]);
}

/**
 * После толкования «карта дня»: основные кнопки + подписка / отписка от ежедневной рассылки.
 */
export function keyboardAfterDayReading(userId: number) {
  const full = hasFullSpreadAccess(userId);
  const rows = full
    ? [
        [Markup.button.callback('На день', 'day')],
        [Markup.button.callback('Прошлое — настоящее — будущее', 'spread')],
      ]
    : [[Markup.button.callback('На день', 'day')]];

  const subRow = isDayPushEnabledSync(userId)
    ? [Markup.button.callback('Отписаться от ежедневной карты', 'day_sub_off')]
    : [Markup.button.callback('Присылать каждый день', 'day_sub_on')];

  return Markup.inlineKeyboard([...rows, subRow]);
}
