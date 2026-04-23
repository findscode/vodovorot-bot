import { Markup } from 'telegraf';
import { formatHhmmForUser } from './calendarDayUserPhrases.js';
import { DAY_PUSH_HHMM_PRESETS } from './dayPushPresets.js';
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

/** Только предложение подписки — для первого в жизни расклада «на день». */
export function keyboardSubscribeDayPushOnly() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Присылать каждый день', 'day_sub_on')],
  ]);
}

/** Пресеты времени ежедневной рассылки (callback <code>pt:HH:MM</code>). */
export function keyboardDayPushTimePresets() {
  const buttons = DAY_PUSH_HHMM_PRESETS.map((hm) =>
    Markup.button.callback(formatHhmmForUser(hm), `pt:${hm}`),
  );
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
  }
  return Markup.inlineKeyboard(rows);
}
