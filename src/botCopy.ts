/**
 * Тексты бота: единый смысл и стиль для /start, /menu, /help и ограничений.
 * Обращение — **на «ты»**; без имён переменных окружения и внутренней кухни.
 * Названия раскладов в тексте — как на кнопках: «На день», «Прошлое — настоящее — будущее», глубинная диагностика.
 */

import type { AccessTier } from './accessTier.js';
import { canUseFullDeepFinal } from './accessTier.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
import { basicTrackPrefix, premiumFeaturePrefix } from './tierDisplay.js';

export const ETHOS =
  'любое толкование — не гарантия будущего, а повод присмотреться к себе и к картам.';

const START_ETHOS = `Запомни: ${ETHOS}`;

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
  'Не удалось получить текст толкования. Попробуй «На день» чуть позже — лимит за сутки не тратится.';

/** Сбой Telegram после успешного ИИ (фото/текст не дошли). */
export const CARD_DAY_DELIVERY_ERROR_MESSAGE =
  'Текст готов, но отправить сообщение в Telegram не вышло. Попробуй «На день» позже — лимит за сутки не тратится.';

/** @deprecated Используйте CARD_DAY_AI_UNAVAILABLE_MESSAGE или CARD_DAY_DELIVERY_ERROR_MESSAGE. */
export const AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE = CARD_DAY_AI_UNAVAILABLE_MESSAGE;

/** Подписчикам: сбой ИИ в день рассылки. */
export const DAY_PUSH_AI_UNAVAILABLE_MESSAGE =
  'Сегодня не удалось прислать карту дня. Завтра попробую снова, если подписка у тебя включена.';

/** Текст под раскладом, если JPEG карт нет. */
export const SPREAD_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас недоступны — ниже пришлю толкование текстом.';

/** Одна карта «На день», файл изображения отсутствует. */
export const CARD_DAY_IMAGE_UNAVAILABLE_MESSAGE =
  'Картинку карты сейчас не покажу — текст толкования пришлю ниже.';

/** Слишком частый тап «На день». */
export const DAY_DEBOUNCE_MESSAGE = 'Ещё секунду — предыдущий запрос обрабатывается.';

/** Параллельный запуск «На день» для того же чата. */
export const DAY_IN_FLIGHT_MESSAGE = 'Уже собираю карту дня — дождись окончания.';

/** После успешного расклада в три карты. */
export const SPREAD_DONE_HINT = 'Следующий расклад — кнопкой ниже или команда <code>/menu</code>.';

/** После сбоя ИИ у расклада «три карты» (фото уже в чате). */
export const SPREAD_AI_RETRY_SUFFIX = 'Нажми «Прошлое — настоящее — будущее» ещё раз.';

/** @deprecated Используй {@link deepIntroHtml} из `tierDisplay.ts`. */
export const DEEP_INTRO_HTML = `<b>Глубинная диагностика</b>

До семи вопросов подряд — на каждый три карты и короткое толкование. Нажми <b>Начать</b>, когда будешь готов.`;

/** @deprecated Используй {@link deepIntroReadyHtml} из `tierDisplay.ts`. */
export const DEEP_INTRO_READY_HTML = `<b>Глубинная диагностика</b>

Напиши первый вопрос или утверждение <b>одним сообщением</b> в чат. Выйти можно кнопкой «Отмена».`;

export const DEEP_INTRO_PRESS_START_MESSAGE =
  'Сначала нажми «Начать», потом напиши вопрос текстом в чат.';

export const DEEP_CANCELLED_MESSAGE = 'Гадание отменено — выбери расклад кнопками ниже.';

export const DEEP_EMPTY_QUESTION_MESSAGE =
  'Напиши вопрос или утверждение текстом — без пустого сообщения.';

export const DEEP_QUESTION_TOO_LONG_MESSAGE =
  'Слишком длинный текст. Сократи вопрос — иначе он не поместится в подпись к фото.';

export const DEEP_CONTINUE_HINT_MESSAGE =
  'Можешь задать ещё один вопрос текстом. Или нажми «Закончить гадание».';

export const DEEP_ALREADY_ACTIVE_MESSAGE =
  'Гадание уже идёт. Напиши следующий вопрос текстом или нажми «Закончить гадание».';

export const DEEP_COLLAGE_HINT_MESSAGE =
  'Коллаж наслоен — на экране телефона мелкий; опирайся на текст толкования ниже.';

/** Сообщение при блокировке команд и других раскладов во время deep-сессии. */
export function deepSessionBlockedMessageHtml(): string {
  return `Сейчас идёт <b>глубинная диагностика</b>. Дождись ответа или нажми «Закончить гадание».

<code>/menu</code> и <code>/help</code> снова сработают после общего вывода.`;
}

export const DEEP_AI_RETRY_MESSAGE =
  'Не удалось получить текст толкования. Отправь тот же вопрос ещё раз — этот шаг не засчитан.';

export const DEEP_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас недоступны — ниже пришлю толкование текстом.';

export const DEEP_FINAL_INTRO_MESSAGE = 'Собираю общий вывод по всему гаданию…';

export const DEEP_DONE_HINT =
  'Гадание завершено. Следующий расклад — кнопками ниже или команда <code>/menu</code>.';

export const DEEP_MAX_TRIPLETS_MESSAGE =
  'Достигнут лимит семи вопросов за одно гадание. Сейчас соберу общий вывод.';

/** Tier `basic`: лимит трёх триплетов (модель C). */
export const DEEP_BASIC_TRIPLET_CAP_MESSAGE =
  'До трёх вопросов за гадание на базовом треке. Сейчас завершу сессию. Полный цикл (семь вопросов и общий вывод) — ⭐️ Premium.';

export const DEEP_BASIC_END_WITHOUT_FINAL_MESSAGE =
  'Гадание завершено. Общий вывод по всем шагам — с ⭐️ <b>Premium</b> (<code>/promo</code> или <code>/status</code>). Следующий расклад — кнопками ниже или <code>/menu</code>.';

export function spreadPremiumRequiredMessage(): string {
  return `Расклад «Прошлое — настоящее — будущее» — ⭐️ <b>Premium</b>. Промокод: <code>/promo КОД</code>. Базовый трек: 🌱 «На день» и 🌱 глубинная диагностика (до трёх вопросов). <code>/status</code>`;
}

export const PROMO_HELP_HTML = `Введи промокод одной командой в чат:

<code>/promo ТВОЙ-КОД</code>

Код одноразовый. После активации откроются расклад «Прошлое — настоящее — будущее» и полная глубинная диагностика. Текущий уровень — <code>/status</code>.`;

export function dayLimitMessage(): string {
  return 'Сегодня карта дня уже была. Новая — после полуночи.';
}

export const LAST_EMPTY_MESSAGE =
  'Пока нечего повторить: сначала сделай любой расклад. Последний разбор хранится в базе и переживает перезапуск; свою копию можно переслать себе из чата.';

export const SUBSCRIBE_MESSAGES = {
  off: 'Ежедневная карта дня выключена. Новую — кнопкой «На день», когда захочешь.',
} as const;

/** После включения подписки (время и пояс — как сохранили при нажатии). */
export function subscribeEnabledMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Готово</b>: подписка включена, карта дня — около ${t}. Отписаться или сменить время — кнопками ниже; иначе <code>/pushtime 14:30</code>.`;
}

/** Выбор времени рассылки (после <code>/pushtime</code> без аргумента или кнопки «Время рассылки»). */
export const PUSHTIME_PICK_PROMPT_HTML =
  'Нажми кнопку с удобным временем или напиши <code>/pushtime ЧЧ:ММ</code> (например <code>09:15</code>):';

export const PUSHTIME_NEED_SUBSCRIPTION_HTML =
  'Сначала включи рассылку кнопкой <b>«Присылать каждый день»</b> под толкованием «На день».';

/** Неверный формат аргумента к <code>/pushtime</code>. */
export const PUSHTIME_INVALID_FORMAT_HTML =
  'Укажи время как <code>ЧЧ:ММ</code> (часы 00–23, минуты 00–59), например <code>09:15</code> или <code>14:30</code>. Или нажми одну из кнопок ниже.';

export function pushtimeSavedMessageHtml(hhmm: string, _tzIana: string): string {
  const t = formatHhmmForUser(hhmm);
  return `<b>Запомнил</b>: рассылка карты дня — около ${t}.`;
}

export const PROMO_MESSAGES = {
  needCode:
    'Укажи код после команды целиком, например: <code>/promo STAR-LANTERN-K7NP4X</code>. Подсказка — кнопка «Промокод» в меню.',
  /** Единый ответ при любой неуспешной активации (без утечки «код есть в базе»). */
  rejected: 'Не удалось активировать код. Проверь написание или запроси новый у организатора.',
  rateLimited: 'Слишком много попыток за короткое время. Подожди около 15 минут и попробуй снова.',
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
  return `<b>Готово</b>, промокод принят. ⭐️ <b>Premium</b> на месяц (до ${dateRu}) — открыты расклад «Прошлое — настоящее — будущее» и полная глубинная диагностика. Подробности — <code>/status</code>. Обнови меню: <code>/menu</code>.`;
}

export function startTextHtml(): string {
  const p = dayDrawPhrasesForServer();
  return `Привет, я <b>Водоворот</b>. Ниже расклады — от простых к сложным.

🌱 «На день» (раз в сутки ${p.dayLimitCalendar}) и 🌱 глубинная диагностика до трёх вопросов. ⭐️ Полный доступ — <code>/promo КОД</code>.

${START_ETHOS}`;
}

export function menuTextHtml(): string {
  return 'Расклады ниже — 🌱 базовый трек и ⭐️ Premium. Промокод — кнопка или <code>/promo</code>.';
}

export function helpTextHtml(opts: { tier: AccessTier }): string {
  const p = dayDrawPhrasesForServer();
  const premiumDeep = canUseFullDeepFinal(opts.tier);
  const dayLine = `• ${basicTrackPrefix()}<b>На день</b> — одна карта и толкование на сутки. Не чаще раза в сутки ${p.dayLimitCalendar}.\n`;

  const spreadLine = premiumDeep
    ? `• ${premiumFeaturePrefix()}<b>Прошлое — настоящее — будущее</b> — три карты и связное толкование.\n`
    : `• ${premiumFeaturePrefix()}<b>Прошлое — настоящее — будущее</b> — с Premium; <code>/promo КОД</code>.\n`;

  const deepLine = premiumDeep
    ? `• ${premiumFeaturePrefix()}<b>Глубинная диагностика</b> — до семи вопросов и общий финал; <b>Начать</b> → вопросы текстом.\n`
    : `• ${basicTrackPrefix()}<b>Глубинная диагностика</b> — до трёх вопросов; полный цикл — ${premiumFeaturePrefix()}Premium (<code>/promo</code>).\n`;

  return `<b>Водоворот</b> — толкование карт Таро в личке. Работает <b>только в личных сообщениях</b>.

<b>Команды</b>
/start — приветствие и кнопки
/menu — снова показать кнопки раскладов
/help — эта справка
/status — уровень доступа, Premium, рассылка
/last — повторить последний разбор (хранится в базе)
/pushtime — время ежедневной рассылки (когда подписка включена); можно <code>/pushtime 09:15</code>
/promo КОД — активировать одноразовый промокод Premium

<b>Расклады</b>
${dayLine}${spreadLine}${deepLine}

<b>Как выбрать</b>
• <b>На день</b> — одна карта на сутки, без твоих вопросов.
• <b>Прошлое — настоящее — будущее</b> — один связный расклад из трёх карт, без уточняющих вопросов.
• <b>Глубинная диагностика</b> — «Начать», затем вопросы текстом и общий финал.

<b>Подписка на карту дня</b>
После «На день» можно включить ежедневную отправку кнопкой «Присылать каждый день». Один раз в сутки — и на ручной запрос, и на рассылку. Время по умолчанию из настроек бота; смена — кнопка <b>«Время рассылки»</b> или <code>/pushtime 14:30</code>. Отписка — в том же сообщении после включения или под следующим толкованием «На день».

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
