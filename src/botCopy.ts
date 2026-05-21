/**
 * Тексты бота: единый смысл и стиль для /start, /menu, /help и ограничений.
 * Обращение — **на «ты»**; без имён переменных окружения и внутренней кухни.
 */

import {
  DAY_LIMIT_ONCE_PER_CALENDAR_DAY,
  dayDrawPhrasesForServer,
  formatHhmmForUser,
} from './calendarDayUserPhrases.js';

export const ETHOS = 'Это не гарантия будущего, а повод присмотреться к себе и к картам.';

/** Короткий дисклеймер для справки и при необходимости в других местах. */
export const DISCLAIMER_HELP =
  'Толкование не заменяет консультацию врача, юриста или финансового специалиста и не обещает конкретных событий.';

/** Необработанная ошибка в хендлере (bot.catch). */
export const UNHANDLED_BOT_ERROR_HTML =
  'Что-то пошло не так. Попробуй ещё раз или открой <code>/menu</code>.';

/** Не удалось получить текст от ИИ (сеть, таймаут, отказ API). */
export const AI_TEXT_UNAVAILABLE_MESSAGE =
  'Не удалось получить текст толкования. Попробуй через пару минут.';

/** Сбой ИИ при «На день» (фото ещё не отправлено — порядок ИИ → фото). */
export const CARD_DAY_AI_UNAVAILABLE_MESSAGE =
  'Не удалось получить текст толкования. Попробуй «На день» чуть позже (лимит суток не тратится).';

/** Сбой Telegram после успешного ИИ (фото/текст не дошли). */
export const CARD_DAY_DELIVERY_ERROR_MESSAGE =
  'Текст готов, но отправить сообщение в Telegram не вышло. Попробуй «На день» позже (лимит суток не тратится).';

/** @deprecated Используйте CARD_DAY_AI_UNAVAILABLE_MESSAGE или CARD_DAY_DELIVERY_ERROR_MESSAGE. */
export const AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE = CARD_DAY_AI_UNAVAILABLE_MESSAGE;

/** Подписчикам: сбой ИИ в день рассылки. */
export const DAY_PUSH_AI_UNAVAILABLE_MESSAGE =
  'Сегодня не удалось прислать карту дня. Завтра попробую снова, если подписка у тебя включена.';

/** Callback «spread» при закрытом доступе. */
export const WHITELIST_NO_SPREAD_ACCESS_CALLBACK = 'К этому раскладу сейчас нет доступа.';

/** Текст под раскладом, если JPEG карт нет. */
export const SPREAD_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас недоступны — ниже пришлю толкование текстом.';

/** Одна карта «на день», файл изображения отсутствует. */
export const CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE =
  'Картинку карты сейчас не покажу — текст толкования пришлю ниже.';

/** Слишком частый тап «На день». */
export const DAY_DEBOUNCE_MESSAGE = 'Ещё секунду — предыдущий запрос обрабатывается.';

/** Параллельный запуск «На день» для того же чата. */
export const DAY_IN_FLIGHT_MESSAGE = 'Уже собираю карту дня — дождись окончания.';

/** После успешного расклада в три карты. */
export const SPREAD_DONE_HINT = 'Новый расклад — снова кнопкой ниже или через /menu.';

/** Глубинная диагностика: вступление. */
export const DEEP_INTRO_HTML = `<b>Глубинная диагностика</b>

До семи уточняющих вопросов подряд — на каждый три карты и короткий разбор. Напиши первый вопрос или утверждение текстом в чат.

${DISCLAIMER_HELP}

Пока гадание идёт, другие команды и расклады недоступны — выйти можно кнопкой «Закончить гадание» или «Отмена» до первого вопроса.`;

export const DEEP_CANCELLED_MESSAGE = 'Гадание отменено. Выбери расклад кнопками ниже.';

export const DEEP_EMPTY_QUESTION_MESSAGE =
  'Напиши вопрос или утверждение текстом — без пустого сообщения.';

export const DEEP_QUESTION_TOO_LONG_MESSAGE =
  'Слишком длинный текст. Сократи вопрос — иначе не влезет в подпись к фото.';

export const DEEP_CONTINUE_HINT =
  'Можешь задать ещё один вопрос — текстом в чат. Или нажми «Закончить гадание».';

export const DEEP_AI_RETRY_MESSAGE =
  'Не удалось получить текст толкования. Отправь тот же вопрос ещё раз — этот шаг не засчитан.';

export const DEEP_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас недоступны — ниже пришлю толкование текстом.';

export const DEEP_FINAL_INTRO_MESSAGE = 'Собираю общий вывод по всему гаданию…';

export const DEEP_DONE_HINT = 'Гадание завершено. Новый расклад — кнопками ниже или через /menu.';

export const DEEP_SESSION_BUSY_MESSAGE =
  'Сейчас идёт глубинная диагностика. Дождись шага или нажми «Закончить гадание».';

export const DEEP_MAX_TRIPLETS_MESSAGE =
  'Достигнут лимит семи вопросов за одно гадание. Сейчас соберу общий вывод.';

export function accessDeniedMessage(): string {
  return `Эта функция сейчас только для приглашённых, с Premium или по промокоду. Карту на день — кнопкой ниже, не чаще раза в сутки ${DAY_LIMIT_ONCE_PER_CALENDAR_DAY}. Если тестируешь закрытую версию — попроси владельца добавить тебя в список доступа.`;
}

export function dayLimitMessage(): string {
  return 'Сегодня карта дня уже была. Новая — после полуночи.';
}

export const LAST_EMPTY_MESSAGE =
  'Пока нечего повторить: сначала сделай расклад. Последний разбор хранится в базе и переживает перезапуск; если нужна своя копия — перешли себе сообщение из чата.';

export const SUBSCRIBE_MESSAGES = {
  off: 'Ежедневная карта дня выключена. Новую — кнопкой «На день», когда захочешь.',
} as const;

/** После включения подписки (время и пояс — как сохранили при нажатии). */
export function subscribeEnabledMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Ок</b>, подписка включена: около ${t}. Отписаться или сменить время — кнопками ниже; иначе <code>/pushtime 14:30</code>.`;
}

/** Выбор времени рассылки (после <code>/pushtime</code> без аргумента или кнопки «Время рассылки»). */
export const PUSHTIME_PICK_PROMPT_HTML =
  'Выбери время кнопкой или напиши <code>/pushtime ЧЧ:ММ</code> (например <code>09:15</code>):';

export const PUSHTIME_NEED_SUBSCRIPTION_HTML =
  'Сначала включи рассылку кнопкой <b>«Присылать каждый день»</b> под разбором «на день».';

/** Неверный формат аргумента к <code>/pushtime</code>. */
export const PUSHTIME_INVALID_FORMAT_HTML =
  'Укажи время как <code>ЧЧ:ММ</code> (часы 00–23, минуты 00–59), например <code>09:15</code> или <code>14:30</code>. Либо выбери одну из кнопок ниже.';

export function pushtimeSavedMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Запомнил</b>: рассылка около ${t}.`;
}

export const PROMO_MESSAGES = {
  needCode: 'Укажи код после команды, например: <code>/promo ДЕМО-КОД</code>',
  ok: 'Промокод принят: Premium продлён на число дней из этого кода.',
  used: 'Этот код уже активировали.',
  expired: 'Срок действия этого кода истёк.',
  invalid: 'Такого кода нет или он ещё не активен.',
} as const;

export function startTextFull(): string {
  return `Привет, я <b>Водоворот</b>. Ниже — карта на день, расклад «прошлое — настоящее — будущее» или <b>глубинная диагностика</b> (до семи вопросов подряд). ${ETHOS}`;
}

export function startTextLimited(): string {
  const p = dayDrawPhrasesForServer();
  return `Привет, я <b>Водоворот</b>. Сейчас можешь вытянуть <b>карту на день</b> — не чаще раза в сутки ${p.dayLimitCalendar} — или <b>глубинную диагностику</b>. Расклад «прошлое — настоящее — будущее» пока только для приглашённых. ${ETHOS}`;
}

export function menuTextFull(): string {
  return 'Снова выбери расклад — кнопки ниже.';
}

export function menuTextLimited(): string {
  const p = dayDrawPhrasesForServer();
  return `Снова кнопки ниже. «На день» — не чаще раза в сутки ${p.dayLimitCalendar}.`;
}

export function helpTextHtml(opts: { fullAccess: boolean }): string {
  const p = dayDrawPhrasesForServer();
  const dayLine = opts.fullAccess
    ? `• <b>На день</b> — одна карта и толкование на день. Не чаще раза в сутки ${p.dayLimitCalendar}.\n`
    : `• <b>На день</b> — одна карта и толкование на день. Не чаще раза в сутки ${p.dayLimitCalendar}.\n`;

  const spreadLine = opts.fullAccess
    ? '• <b>Прошлое — настоящее — будущее</b> — три карты и связное толкование.\n'
    : '• Расклад «прошлое — настоящее — будущее» — только для приглашённых, с Premium или по промокоду, если включён закрытый доступ.\n';

  const deepLine =
    '• <b>Глубинная диагностика</b> — до семи вопросов подряд за одно гадание, три карты на каждый; общий вывод в конце. Пока сессия идёт, другие команды не обрабатываются.';

  return `<b>Водоворот</b> — толкование карт Таро в личке. Работает <b>только в личных сообщениях</b>.

<b>Команды</b>
/start — приветствие и кнопки
/menu — снова показать кнопки раскладов
/help — эта справка
/status — что сейчас доступно, подписка и Premium
/last — повторить последний разбор (хранится в базе)
/pushtime — время ежедневной рассылки (когда подписка включена); можно <code>/pushtime 09:15</code>
/promo КОД — активировать одноразовый промокод Premium

<b>Расклады</b>
${dayLine}${spreadLine}${deepLine}

<b>Подписка на «карту дня»</b>
После разбора «на день» можно включить ежедневную отправку кнопкой «Присылать каждый день». Один раз в сутки — и на ручной запрос, и на рассылку. Время по умолчанию из настроек бота; смена — <b>«Время рассылки»</b> или <code>/pushtime 14:30</code>. Отписка — кнопкой в том же сообщении после включения или под следующим разбором «на день».

<b>Важно</b>
${DISCLAIMER_HELP}`;
}

export function isPublicEntryCommand(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    /^\/start(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/menu(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/help(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/status(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/last(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/promo(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/pushtime(?:@\S+)?(?:\s|$)/i.test(t)
  );
}
