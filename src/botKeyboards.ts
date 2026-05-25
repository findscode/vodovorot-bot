import { Markup } from 'telegraf';
import { formatHhmmForUser } from './calendarDayUserPhrases.js';
import { DAY_PUSH_HHMM_PRESETS } from './dayPushPresets.js';
import { hasUnlimitedSpreadAccess } from './accessResolve.js';
import { canUseFullDeepFinal, resolveAccessTier } from './accessTier.js';
import { isDayPushEnabledSync } from './db/usersRepo.js';
import { labelBasicLevelButton, labelPremiumButton } from './tierDisplay.js';
import { SPREAD_BUTTON_LABEL } from './spreadLabels.js';

function mainSpreadRows(userId: number | undefined) {
  const tier = resolveAccessTier(userId);
  const rows: ReturnType<typeof Markup.button.callback>[][] = [
    [Markup.button.callback(labelBasicLevelButton('На день'), 'day')],
  ];
  const spreadLabel = hasUnlimitedSpreadAccess(userId)
    ? labelPremiumButton(SPREAD_BUTTON_LABEL.spread)
    : labelBasicLevelButton(SPREAD_BUTTON_LABEL.spread);
  rows.push([Markup.button.callback(spreadLabel, 'spread')]);
  if (!hasUnlimitedSpreadAccess(userId)) {
    rows.push([Markup.button.callback(labelPremiumButton('Промокод (Premium)'), 'promo_help')]);
  }
  const deepLabel = canUseFullDeepFinal(tier)
    ? labelPremiumButton('Глубинная диагностика')
    : labelBasicLevelButton('Глубинная диагностика');
  rows.push([Markup.button.callback(deepLabel, 'deep')]);
  return rows;
}

export function keyboardMainOrDayOnly(userId: number | undefined) {
  return Markup.inlineKeyboard(mainSpreadRows(userId));
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
  return Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'spread_cancel')]]);
}

export function keyboardWhatsNewDismiss() {
  return Markup.inlineKeyboard([[Markup.button.callback('Понятно', 'release_notes_ok')]]);
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
