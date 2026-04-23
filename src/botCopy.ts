/**
 * Тексты бота: единый смысл и стиль для /start, /menu, /help и ограничений.
 * Обращение — **на «ты»**; без имён переменных окружения и внутренней кухни.
 */

import { dayDrawPhrasesForServer, formatHhmmForUser, phrasesForIanaTimezone } from './calendarDayUserPhrases.js';

export const ETHOS = 'Это не гарантия будущего, а повод присмотреться к себе и к картам.';

/** Короткий дисклеймер для справки и при необходимости в других местах. */
export const DISCLAIMER_HELP =
  'Толкование не заменяет консультацию врача, юриста или финансового специалиста и не обещает конкретных событий.';

/** Ожидание ответа модели перед толкованием (ручной расклад, три карты). */
export const READING_BUILDING_MESSAGE = 'Секунду, собираю текст толкования…';

/** Не удалось получить текст от ИИ (сеть, таймаут, отказ API). */
export const AI_TEXT_UNAVAILABLE_MESSAGE =
  'Не удалось получить текст толкования. Попробуй через пару минут.';

/** После карты «на день», если ИИ не ответил — карта уже в чате. */
export const AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE =
  'Текст толкования сейчас не подтянулся — картинка карты уже выше. Попробуй «На день» чуть позже (лимит суток не тратится).';

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

export function accessDeniedMessage(): string {
  const p = dayDrawPhrasesForServer();
  return `Эта функция сейчас только для приглашённых, с Premium или по промокоду. Карту на день — кнопкой ниже, не чаще раза в сутки ${p.dayLimitCalendar}. Если тестируешь закрытую версию — попроси владельца добавить тебя в список доступа.`;
}

export function dayLimitMessage(): string {
  const p = dayDrawPhrasesForServer();
  return `Сегодня карта дня уже была. Новая — после полуночи ${p.midnight}.`;
}

export const LAST_EMPTY_MESSAGE =
  'Пока нечего повторить: сначала сделай расклад. Текст держу недолго — если хочешь сохранить, перешли себе последнее сообщение с разбором. Если прошло много часов — сделай новый расклад.';

/** После первого в жизни «на день»: одна кнопка подписки и пояснение. */
export const FIRST_DAY_PUSH_FOOTER_HTML =
  'Можно включить ежедневную <b>карту дня</b>: раз в сутки пришлю такой разбор без отдельного запроса. Ниже — одна кнопка. Чтобы снова увидеть все кнопки раскладов, напиши <code>/menu</code>.';

export const SUBSCRIBE_MESSAGES = {
  off: 'Ежедневная карта дня выключена. Новую — кнопкой «На день», когда захочешь.',
} as const;

/** После включения подписки (время и пояс — как сохранили при нажатии). */
export function subscribeEnabledMessageHtml(hhmm: string, tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  const p = phrasesForIanaTimezone(tzIana);
  return `<b>Ок</b>, подписка включена. Ориентир по времени — около ${t} (${p.pushClockInstrumental}). Отписаться — кнопкой под следующим разбором.`;
}

export const PROMO_MESSAGES = {
  needCode: 'Укажи код после команды, например: <code>/promo ДЕМО-КОД</code>',
  ok: 'Промокод принят: Premium продлён на число дней из этого кода.',
  used: 'Этот код уже активировали.',
  expired: 'Срок действия этого кода истёк.',
  invalid: 'Такого кода нет или он ещё не активен.',
} as const;

export function startTextFull(): string {
  return `Привет, я <b>Водоворот</b>. Ниже — карта на день или расклад «прошлое — настоящее — будущее». ${ETHOS}`;
}

export function startTextLimited(): string {
  const p = dayDrawPhrasesForServer();
  return `Привет, я <b>Водоворот</b>. Сейчас можешь вытянуть <b>карту на день</b> — не чаще раза в сутки ${p.dayLimitCalendar}. Расклад «прошлое — настоящее — будущее» пока только для приглашённых. ${ETHOS}`;
}

export function menuTextFull(): string {
  return 'Снова выбери расклад — две кнопки ниже.';
}

export function menuTextLimited(): string {
  const p = dayDrawPhrasesForServer();
  return `Снова кнопка «На день» ниже. Не чаще раза в сутки ${p.dayLimitCalendar}.`;
}

export function helpTextHtml(opts: { fullAccess: boolean }): string {
  const p = dayDrawPhrasesForServer();
  const dayLine = opts.fullAccess
    ? `• <b>На день</b> — одна карта и толкование на день. Не чаще раза в сутки ${p.dayLimitCalendar}.\n`
    : `• <b>На день</b> — одна карта и толкование на день. Не чаще раза в сутки ${p.dayLimitCalendar}.\n`;

  const spreadLine = opts.fullAccess
    ? '• <b>Прошлое — настоящее — будущее</b> — три карты и связное толкование.'
    : '• Расклад «прошлое — настоящее — будущее» — только для приглашённых, с Premium или по промокоду, если включён закрытый доступ.';

  return `<b>Водоворот</b> — толкование карт Таро в личке. Работает <b>только в личных сообщениях</b>.

<b>Команды</b>
/start — приветствие и кнопки
/menu — снова показать кнопки раскладов
/help — эта справка
/status — что сейчас доступно, подписка и Premium
/last — повторить последний разбор (коротко хранится в этой переписке; надолго — перешли сообщение себе)
/promo КОД — активировать одноразовый промокод Premium

<b>Расклады</b>
${dayLine}${spreadLine}

<b>Подписка на «карту дня»</b>
После разбора «на день» можно включить ежедневную отправку кнопкой «Присылать каждый день». Один раз в сутки — и на ручной запрос, и на рассылку. Время в ответе после включения — ориентир для следующих писем.

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
    /^\/promo(?:@\S+)?(?:\s|$)/i.test(t)
  );
}
