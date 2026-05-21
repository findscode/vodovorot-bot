import { Markup } from 'telegraf';
import { formatHhmmForUser } from './calendarDayUserPhrases.js';
import { DAY_PUSH_HHMM_PRESETS } from './dayPushPresets.js';
import { hasFullSpreadAccess } from './accessResolve.js';
import { isDayPushEnabledSync } from './db/usersRepo.js';

function mainSpreadRows(userId: number | undefined) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [
    [Markup.button.callback('На день', 'day')],
  ];
  if (hasFullSpreadAccess(userId)) {
    rows.push([Markup.button.callback('Прошлое — настоящее — будущее', 'spread')]);
  }
  rows.push([Markup.button.callback('Глубинная диагностика', 'deep')]);
  return rows;
}

export function keyboardMainOrDayOnly(userId: number | undefined) {
  return Markup.inlineKeyboard(mainSpreadRows(userId));
}

export function keyboardDeepIntro() {
  return Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'deep_cancel')]]);
}

export function keyboardDeepInChain() {
  return Markup.inlineKeyboard([[Markup.button.callback('Закончить гадание', 'deep_end')]]);
}

/**
 * После толкования «карта дня»: основные кнопки + подписка / отписка от ежедневной рассылки.
 */
export function keyboardAfterDayReading(userId: number) {
  const rows = mainSpreadRows(userId);

  const subRow = isDayPushEnabledSync(userId)
    ? [Markup.button.callback('Отписаться от ежедневной карты', 'day_sub_off')]
    : [Markup.button.callback('Присылать каждый день', 'day_sub_on')];

  return Markup.inlineKeyboard([...rows, subRow]);
}

/** Callback: открыть выбор времени рассылки (как <code>/pushtime</code> без аргумента). */
export const DAY_PUSH_TIME_MENU_CALLBACK = 'dp:time';

/**
 * После включения подписки: расклады + смена времени + отписка (без ожидания следующего «на день»).
 */
export function keyboardMainOrDayPlusDayPushShortcut(userId: number | undefined) {
  const rows = mainSpreadRows(userId);
  rows.push([Markup.button.callback('Время рассылки', DAY_PUSH_TIME_MENU_CALLBACK)]);
  rows.push([Markup.button.callback('Отписаться от ежедневной карты', 'day_sub_off')]);
  return Markup.inlineKeyboard(rows);
}

/** Частые варианты времени рассылки (callback <code>pt:HH:MM</code>); любое другое — <code>/pushtime ЧЧ:ММ</code>. */
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
