import { Markup } from 'telegraf';
import { formatHhmmForUser } from './calendarDayUserPhrases.js';
import { DAY_PUSH_HHMM_PRESETS } from './dayPushPresets.js';
import { isDayPushEnabledSync } from './db/usersRepo.js';
import { CLARITY_KEEP_CALLBACK, CLARITY_REFINE_CALLBACK } from './questionClarityConstants.js';
import { DEEP_CANCEL_CALLBACK } from './deepReading/constants.js';
import { SPREAD_CANCEL_CALLBACK } from './spreadConstants.js';
import { webappSettingsUrl } from './webapp/webappConfig.js';

/** Пустая клавиатура — главная сетка раскладов в Mini App (#4.4). */
export function keyboardMainOrDayOnly(_userId: number | undefined) {
  return Markup.inlineKeyboard([]);
}

export function keyboardOpenMenuWebApp() {
  const url = webappSettingsUrl();
  if (!url) {
    return Markup.inlineKeyboard([]);
  }
  return Markup.inlineKeyboard([[Markup.button.webApp('Открыть меню', url)]]);
}

export function keyboardDeepIntro() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Начать', 'deep_start'),
      Markup.button.callback('Отмена', 'deep_cancel'),
    ],
  ]);
}

export function keyboardSpreadIntro() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Начать', 'spread_start'),
      Markup.button.callback('Отмена', 'spread_cancel'),
    ],
  ]);
}

/** После «Начать» — ждём первый вопрос, только отмена. */
export function keyboardDeepAwaitingFirst() {
  return Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'deep_cancel')]]);
}

export function keyboardSpreadAwaitingQuestion() {
  return Markup.inlineKeyboard([[Markup.button.callback('Отмена', SPREAD_CANCEL_CALLBACK)]]);
}

function keyboardClarification(cancelCallback: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Уточнить', CLARITY_REFINE_CALLBACK),
      Markup.button.callback('Оставить так', CLARITY_KEEP_CALLBACK),
    ],
    [Markup.button.callback('Отмена', cancelCallback)],
  ]);
}

export function keyboardSpreadClarification() {
  return keyboardClarification(SPREAD_CANCEL_CALLBACK);
}

export function keyboardDeepClarification() {
  return keyboardClarification(DEEP_CANCEL_CALLBACK);
}

export function keyboardWhatsNewDismiss() {
  return Markup.inlineKeyboard([[Markup.button.callback('Понятно', 'release_notes_ok')]]);
}

export function keyboardDeepInChain() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Закончить гадание', 'deep_end')],
    [Markup.button.callback('Выйти без общего вывода', DEEP_CANCEL_CALLBACK)],
  ]);
}

/**
 * После толкования «карта дня»: только подписка / отписка от ежедневной рассылки.
 */
export function keyboardAfterDayReading(userId: number) {
  const subRow = isDayPushEnabledSync(userId)
    ? [Markup.button.callback('Отписаться от ежедневной карты', 'day_sub_off')]
    : [Markup.button.callback('Присылать каждый день', 'day_sub_on')];

  return Markup.inlineKeyboard([subRow]);
}

/** Callback: открыть выбор времени рассылки (как <code>/pushtime</code> без аргумента). */
export const DAY_PUSH_TIME_MENU_CALLBACK = 'dp:time';

/** После включения подписки: смена времени + отписка. */
export function keyboardMainOrDayPlusDayPushShortcut(_userId: number | undefined) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Время рассылки', DAY_PUSH_TIME_MENU_CALLBACK)],
    [Markup.button.callback('Отписаться от ежедневной карты', 'day_sub_off')],
  ]);
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
