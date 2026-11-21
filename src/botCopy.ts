/**
 * Тексты бота: единый смысл и стиль для /start, /menu, /help и ограничений.
 * Обращение — **на «ты»**; без имён переменных окружения и внутренней кухни.
 * Тон — спокойный, чуть образный: без канцелярита («сессия», «запрос», «не засчитан»)
 * и без пафоса («вселенная», «энергии»). Подробнее — BRAND-GUIDE §1.
 * Названия раскладов в тексте — как на кнопках: «На день», «Прошлое — настоящее — будущее», глубинная диагностика.
 */

import type { AccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import type { DeepSessionPhase } from './deepReading/sessionStore.js';
import {
  quotedSpreadLabel,
  SPREAD_BUTTON_LABEL,
  spreadAccessOverviewHtml,
  type SpreadAccessOverviewOpts,
} from './spreadLabels.js';
import { spreadTitleLineHtml } from './spreadLabels.js';

export const ETHOS =
  'любое толкование — не гарантия будущего, а повод присмотреться к себе и к картам.';

const START_ETHOS = `Запомни: ${ETHOS}`;

/** Короткий дисклеймер для справки и при необходимости в других местах. */
export const DISCLAIMER_HELP =
  'Толкование — ориентир для размышления, не приговор и не гарантия событий. Не заменяет консультацию врача, юриста или финансового специалиста.';

/** Необработанная ошибка в хендлере (bot.catch). Гадание не обрываем. */
export const UNHANDLED_BOT_ERROR_HTML =
  'Что-то сбилось. Если гадание уже идёт — повтори последний шаг; если нет — открой <b>Меню</b>.';

export const WEBAPP_LAUNCH_ERROR_HTML =
  'Расклад не запустился. Открой <b>Меню</b> и попробуй ещё раз.';

/** Не удалось получить текст от ИИ (сеть, таймаут, отказ API). */
export const AI_TEXT_UNAVAILABLE_MESSAGE = 'Толкование не сложилось. Попробуй чуть позже.';

/** Сбой ИИ при «На день» (фото ещё не отправлено — порядок ИИ → фото). */
export const CARD_DAY_AI_UNAVAILABLE_MESSAGE =
  'Толкование не сложилось. Попробуй «На день» ещё раз — сегодняшняя попытка не потрачена.';

/** Сбой Telegram после успешного ИИ (фото/текст не дошли). */
export const CARD_DAY_DELIVERY_ERROR_MESSAGE =
  'Толкование готово, но отправить его не вышло. Попробуй «На день» чуть позже — сегодняшняя попытка не потрачена.';

/** Подписчикам: сбой ИИ в день рассылки. */
export const DAY_PUSH_AI_UNAVAILABLE_MESSAGE =
  'Сегодня прислать карту дня не получилось. Завтра попробую снова, если рассылка включена.';

/** Повреждённые сохранённые настройки push: отключаем, пользователь включает заново. */
export const DAY_PUSH_CONFIG_ERROR_MESSAGE =
  'Рассылка «На день» выключена: время или часовой пояс, которые ты задавал, больше не подходят. Включи её снова в <b>Меню</b>.';

/** Текст под раскладом, если JPEG карт нет. */
export const SPREAD_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас не открываются — толкование пришлю текстом.';

/** Одна карта «На день», файл изображения отсутствует. */
export const CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE =
  'Картинку карты сейчас показать не получится — толкование пришлю ниже.';

/** Слишком частый тап «На день». */
export const DAY_DEBOUNCE_MESSAGE = 'Подожди секунду — карта уже раскрывается.';

/** Параллельный запуск «На день» для того же чата. */
export const DAY_IN_FLIGHT_MESSAGE = 'Карта дня уже раскрывается — подожди немного.';

/** После успешного расклада в три карты. */
export const SPREAD_DONE_HINT = 'Следующий расклад — в <b>Меню</b>.';

/** После сбоя ИИ у расклада «три карты»: расклад открыт, вопрос можно повторить. */
export const SPREAD_AI_RETRY_MESSAGE =
  'Толкование не сложилось. Напиши вопрос ещё раз — расклад по-прежнему открыт.';

export const SPREAD_CANCELLED_MESSAGE = 'Расклад отменён — следующий выбери в <b>Меню</b>.';

/** Сбой сборки фото или отправки после успешного ответа ИИ у «три карты»: расклад открыт. */
export const SPREAD_DELIVERY_RETRY_MESSAGE =
  'Расклад готов, но отправить его не вышло. Напиши вопрос ещё раз — расклад по-прежнему открыт.';

export const SPREAD_ALREADY_AWAITING_MESSAGE =
  'Расклад уже начат — напиши вопрос или нажми «Отмена».';

export const QUESTION_CLARITY_AWAITING_MESSAGE =
  'Сейчас жду твоё решение. Нажми «Уточнить», «Оставить так» или «Отмена» под подсказкой.';

export const SPREAD_IN_FLIGHT_MESSAGE = 'Карты уже раскладываются — подожди немного.';

/** Подсказка после служебной проверки ясности вопроса (#54). */
export function questionClarityMessageHtml(hint: string): string {
  return `<b>Можно уточнить вопрос</b>\n\n${hint}\n\nПерепиши вопрос или оставь как есть — кнопки ниже.`;
}

export const QUESTION_CLARITY_REFINE_MESSAGE =
  'Напиши уточнённый вопрос или тему одним сообщением в чат.';

export function spreadLimitMessage(): string {
  const p = dayDrawPhrasesForServer();
  return `Сегодня три расклада «Прошлое — настоящее — будущее» уже сделаны. Новые откроются ${p.midnight} — как у «На день». Без лимита — ⭐️ Premium (<code>/promo</code>).`;
}

/** Сообщение при блокировке команд и других раскладов во время «трёх карт». */
export function spreadSessionBlockedMessageHtml(
  tier: AccessTier,
  phase: 'intro' | 'awaiting_question' | 'awaiting_clarification',
): string {
  const title = spreadTitleLineHtml(tier, 'spread');
  if (phase === 'intro') {
    return `Сейчас открыт ${title}. Напиши вопрос или тему, нажми «Начать» или «Отмена».`;
  }
  if (phase === 'awaiting_clarification') {
    return `Сначала реши, уточнять ли вопрос для ${title}: нажми кнопку под подсказкой или «Отмена».`;
  }
  return `Сейчас жду вопрос для ${title}. Напиши текстом или нажми «Отмена».`;
}

export const DEEP_CANCELLED_MESSAGE = 'Гадание отменено — следующий расклад в <b>Меню</b>.';

export const DEEP_CANCELLED_WITHOUT_FINAL_MESSAGE =
  'Гадание завершено без общего вывода — следующий расклад выбери в <b>Меню</b>.';

export const DEEP_EMPTY_QUESTION_MESSAGE =
  'Напиши вопрос или утверждение текстом — пустое сообщение не подойдёт.';

export const DEEP_QUESTION_TOO_LONG_MESSAGE =
  'Вопрос получился длинным. Сократи его — он должен поместиться в подпись к картам.';

export const DEEP_CONTINUE_HINT_MESSAGE =
  'Можешь задать ещё один вопрос текстом. Или нажми «Закончить гадание».';

export const DEEP_ALREADY_ACTIVE_MESSAGE =
  'Гадание уже идёт. Напиши следующий вопрос текстом или нажми «Закончить гадание».';

export const DEEP_COLLAGE_HINT_MESSAGE =
  'Карты наложились друг на друга, на телефоне они мелкие — опирайся на текст ниже.';

/** Сообщение при блокировке команд и других раскладов во время глубинной диагностики. */
export function deepSessionBlockedMessageHtml(tier: AccessTier, phase: DeepSessionPhase): string {
  const title = spreadTitleLineHtml(tier, 'deep');
  if (phase === 'intro') {
    return `Сейчас открыт ${title}. Напиши вопрос, нажми «Начать» или «Отмена».`;
  }
  if (phase === 'awaiting_first_question') {
    return `Сейчас идёт ${title}. Напиши первый вопрос или нажми «Отмена».`;
  }
  if (phase === 'awaiting_clarification') {
    return `Сначала реши, уточнять ли вопрос для ${title}: нажми кнопку под подсказкой или «Отмена».`;
  }
  if (phase === 'awaiting_final_retry') {
    return `Сейчас идёт ${title}. Нажми «Закончить гадание», чтобы собрать общий вывод ещё раз.`;
  }
  return `Сейчас идёт ${title}. Напиши следующий вопрос или нажми «Закончить гадание».`;
}

export const DEEP_AI_RETRY_MESSAGE =
  'Толкование не сложилось. Отправь тот же вопрос ещё раз — он не потрачен.';

/** Непредвиденный сбой deep-шага до или во время сборки расклада (не ошибка модели). */
export const DEEP_STEP_FAILED_MESSAGE =
  'Этот шаг не получилось собрать. Отправь тот же вопрос ещё раз — он не потрачен.';

/** Сбой сборки фото или отправки у deep-шага; текст ИИ сохранён, ответ не пропадёт. */
export const DEEP_DELIVERY_RETRY_MESSAGE =
  'Толкование готово, но отправить его не вышло. Отправь тот же вопрос ещё раз — он не потрачен, ответ сохранён.';

export const DEEP_FINAL_RETRY_MESSAGE =
  'Общий вывод не сложился. Нажми «Закончить гадание» ещё раз — предыдущие шаги сохранены.';

export const DEEP_IN_FLIGHT_MESSAGE =
  'Ещё отвечаю на твой вопрос — подожди немного или нажми «Закончить гадание».';

export const DEEP_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас не открываются — толкование пришлю текстом.';

export const DEEP_FINAL_INTRO_MESSAGE = 'Свожу всё гадание в общий вывод…';

export const DEEP_DONE_HINT = 'Гадание завершено. Следующий расклад — в <b>Меню</b>.';

export const DEEP_MAX_TRIPLETS_MESSAGE =
  'Семь вопросов за одно гадание — это предел. Свожу общий вывод.';

/** Tier `basic`: лимит трёх триплетов (модель C). */
export const DEEP_BASIC_TRIPLET_CAP_MESSAGE =
  'На базовом уровне — до трёх вопросов за гадание. Свожу короткий общий вывод.';

export const DEEP_BASIC_FINAL_INTRO_MESSAGE = 'Свожу гадание в короткий общий вывод…';

export const DEEP_BASIC_FINAL_UPSELL =
  'На ⭐️ Premium — до семи вопросов и полный общий финал по всему гаданию. Следующий расклад — в <b>Меню</b>.';

/** Прерванное гадание при новом запуске из Mini App (#4.4). */
export type ReadingAbortKind = 'spread' | 'deep_with_triplets' | 'deep_intro';

export function readingAbortedNoticeHtml(kind: ReadingAbortKind): string {
  switch (kind) {
    case 'deep_with_triplets':
      return 'Текущее гадание прервано <b>без общего вывода</b>.';
    case 'spread':
      return 'Текущий расклад прерван.';
    case 'deep_intro':
      return 'Глубинная диагностика отменена — можно начать другой расклад.';
  }
}

/** Указатель на Mini App вместо длинной справки в чате (#57). */
export const HELP_WEBAPP_POINTER_HTML = `<b>Справка и настройки</b>

Открой <b>Меню</b> у поля ввода — там расклады, уровень доступа, лимиты, рассылка «На день» и полная справка.

<b>Если Меню не открывается:</b>
• <code>/help full</code> — полная справка текстом
• <code>/pushtime</code> — смена времени рассылки без App`;

export function spreadPremiumRequiredMessage(): string {
  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const dayQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.day);
  const deepQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep);
  return `Расклад ${spreadQ} — ⭐️ <b>Premium</b>. Код приходит от администратора — <code>/promo</code>. Базовый уровень: 🌱 ${dayQ} и 🌱 ${deepQ}.`;
}

export const PROMO_HELP_HTML = `<b>Промокод</b>

Перешли сюда сообщение с кодом от администратора.`;

export function dayLimitMessage(): string {
  return 'На сегодня карта дня уже получена. Следующая — после полуночи.';
}

export const SUBSCRIBE_MESSAGES = {
  off: 'Ежедневная рассылка выключена. Карту дня в любой момент — в <b>Меню</b>.',
  paused: 'Ежедневная рассылка пока на паузе. Карту дня по-прежнему можно взять в <b>Меню</b>.',
} as const;

/** После включения подписки (время и пояс — как сохранили при нажатии). */
export function subscribeEnabledMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Готово</b>: подписка включена. Карта дня будет приходить около ${t}. Отписаться или сменить время — кнопками ниже.`;
}

/** Выбор времени рассылки (после <code>/pushtime</code> без аргумента или кнопки «Время рассылки»). */
export const PUSHTIME_PICK_PROMPT_HTML = 'Выбери время кнопкой ниже:';

export const PUSHTIME_NEED_SUBSCRIPTION_HTML =
  'Сначала включи рассылку кнопкой <b>«Присылать каждый день»</b> под толкованием «На день».';

/** Неверный формат аргумента к <code>/pushtime</code>. */
export const PUSHTIME_INVALID_FORMAT_HTML =
  'Укажи время как ЧЧ:ММ (часы 00–23, минуты 00–59), например 09:15. Или нажми кнопку ниже.';

export function pushtimeSavedMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Запомнил</b>: рассылка — около ${t}.`;
}

export const PROMO_MESSAGES = {
  needCode: 'Код приходит от администратора — перешли его сообщение сюда.',
  /** Единый ответ при любой неуспешной активации (без утечки «код есть в базе»). */
  rejected: 'Код не подошёл. Проверь написание или попроси новый у администратора.',
  rateLimited: 'Слишком много попыток подряд. Подожди около 15 минут и попробуй снова.',
} as const;

export function promoOkMessageHtml(until: Date): string {
  let dateRu: string;
  try {
    dateRu = until.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    dateRu = until.toISOString().slice(0, 10);
  }
  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const deepQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep);
  return `<b>Готово</b>, промокод принят. ⭐️ <b>Premium</b> на месяц (до ${dateRu}) — доступны ${spreadQ} и полная ${deepQ}.`;
}

export function startTextHtml(opts: SpreadAccessOverviewOpts): string {
  return `Привет, я <b>Водоворот</b>. Расклады — в <b>Меню</b> у поля ввода.

${spreadAccessOverviewHtml(opts)}

${START_ETHOS}`;
}

export function menuTextHtml(opts: SpreadAccessOverviewOpts): string {
  return `<b>Расклады</b>

${spreadAccessOverviewHtml(opts)}`;
}

export function isPublicEntryCommand(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    /^\/start(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/help(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/status(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/promo(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/pushtime(?:@\S+)?(?:\s|$)/i.test(t)
  );
}
