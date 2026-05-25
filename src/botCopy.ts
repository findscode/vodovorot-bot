/**
 * Тексты бота: единый смысл и стиль для /start, /menu, /help и ограничений.
 * Обращение — **на «ты»**; без имён переменных окружения и внутренней кухни.
 * Названия раскладов в тексте — как на кнопках: «На день», «Прошлое — настоящее — будущее», глубинная диагностика.
 */

import type { AccessTier } from './accessTier.js';
import { dayDrawPhrasesForServer, formatHhmmForUser } from './calendarDayUserPhrases.js';
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

/** Необработанная ошибка в хендлере (bot.catch). */
export const UNHANDLED_BOT_ERROR_HTML =
  'Что-то пошло не так. Попробуй ещё раз или выбери расклад кнопками ниже.';

/** Не удалось получить текст от ИИ (сеть, таймаут, отказ API). */
export const AI_TEXT_UNAVAILABLE_MESSAGE =
  'Не удалось получить текст толкования. Попробуй через пару минут.';

/** Сбой ИИ при «На день» (фото ещё не отправлено — порядок ИИ → фото). */
export const CARD_DAY_AI_UNAVAILABLE_MESSAGE =
  'Не удалось получить толкование. Попробуй «На день» ещё раз — лимит за сутки не тратится.';

/** Сбой Telegram после успешного ИИ (фото/текст не дошли). */
export const CARD_DAY_DELIVERY_ERROR_MESSAGE =
  'Толкование готово, но отправить сообщение в Telegram не вышло. Попробуй «На день» позже — лимит за сутки не тратится.';

/** @deprecated Используйте CARD_DAY_AI_UNAVAILABLE_MESSAGE или CARD_DAY_DELIVERY_ERROR_MESSAGE. */
export const AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE = CARD_DAY_AI_UNAVAILABLE_MESSAGE;

/** Подписчикам: сбой ИИ в день рассылки. */
export const DAY_PUSH_AI_UNAVAILABLE_MESSAGE =
  'Сегодня не удалось прислать карту дня по подписке. Завтра попробую снова, если она включена.';

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
export const SPREAD_DONE_HINT = 'Следующий расклад — кнопками ниже.';

/** После сбоя ИИ у расклада «три карты» (фото уже в чате). */
export const SPREAD_AI_RETRY_SUFFIX =
  'Нажми «Прошлое — настоящее — будущее» ещё раз и напиши вопрос заново.';

export const SPREAD_CANCELLED_MESSAGE = 'Расклад отменён — выбери другой кнопками ниже.';

export const SPREAD_ALREADY_AWAITING_MESSAGE =
  'Расклад уже начат — нажми «Начать» или «Отмена», либо напиши вопрос, если уже нажал «Начать».';

export const SPREAD_INTRO_PRESS_START_MESSAGE =
  'Сначала нажми «Начать», потом напиши вопрос или тему текстом в чат.';

export const SPREAD_IN_FLIGHT_MESSAGE = 'Расклад уже готовится — подожди ответ.';

/** Подсказка после служебной проверки ясности вопроса (#54). */
export function questionClarityMessageHtml(hint: string): string {
  return `<b>Можно уточнить вопрос</b>\n\n${hint}\n\nПерепиши запрос или оставь как есть — кнопки ниже.`;
}

export const QUESTION_CLARITY_REFINE_MESSAGE =
  'Напиши уточнённый вопрос или тему одним сообщением в чат.';

export function spreadLimitMessage(): string {
  const p = dayDrawPhrasesForServer();
  return `На сегодня три расклада «Прошлое — настоящее — будущее» уже использованы. Следующие — ${p.midnight} (как у «На день»). Без лимита — ⭐️ Premium (кнопка «Промокод»).`;
}

/** Сообщение при блокировке команд и других раскладов во время сессии «три карты». */
export function spreadSessionBlockedMessageHtml(
  tier: AccessTier,
  phase: 'intro' | 'awaiting_question' | 'awaiting_clarification',
): string {
  const title = spreadTitleLineHtml(tier, 'spread');
  if (phase === 'intro') {
    return `Сейчас открыт ${title}. Нажми «Начать» или «Отмена».`;
  }
  if (phase === 'awaiting_clarification') {
    return `Сейчас жду решения по уточнению вопроса для ${title}. Нажми кнопку под подсказкой или «Отмена».`;
  }
  return `Сейчас жду вопрос для ${title}. Напиши текстом или нажми «Отмена».`;
}

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
export function deepSessionBlockedMessageHtml(tier: AccessTier): string {
  return `Сейчас идёт ${spreadTitleLineHtml(tier, 'deep')}. Дождись ответа или нажми «Закончить гадание».`;
}

export const DEEP_AI_RETRY_MESSAGE =
  'Не удалось получить текст толкования. Отправь тот же вопрос ещё раз — этот шаг не засчитан.';

export const DEEP_IMAGES_UNAVAILABLE_SUFFIX =
  'Картинки карт сейчас недоступны — ниже пришлю толкование текстом.';

export const DEEP_FINAL_INTRO_MESSAGE = 'Собираю общий вывод по всему гаданию…';

export const DEEP_DONE_HINT = 'Гадание завершено. Следующий расклад — кнопками ниже.';

export const DEEP_MAX_TRIPLETS_MESSAGE =
  'Достигнут лимит семи вопросов за одно гадание. Сейчас соберу общий вывод.';

/** Tier `basic`: лимит трёх триплетов (модель C). */
export const DEEP_BASIC_TRIPLET_CAP_MESSAGE =
  'На базовом уровне — до трёх вопросов за гадание. Сейчас завершу сессию. Полный цикл (семь вопросов и общий вывод) — ⭐️ Premium.';

export const DEEP_BASIC_END_WITHOUT_FINAL_MESSAGE =
  'Гадание завершено. Общий вывод по всем шагам — с ⭐️ <b>Premium</b> (кнопка «Промокод»). Следующий расклад — кнопками ниже.';

export function spreadPremiumRequiredMessage(): string {
  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const dayQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.day);
  const deepQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep);
  return `Расклад ${spreadQ} — ⭐️ <b>Premium</b>. Код приходит от администратора — кнопка «Промокод» ниже. Базовый уровень: 🌱 ${dayQ} и 🌱 ${deepQ}.`;
}

export const PROMO_HELP_HTML = `<b>Промокод</b>

Перешли сюда сообщение с кодом от администратора.`;

export function dayLimitMessage(): string {
  return 'На сегодня карта дня уже получена. Следующая — после полуночи.';
}

export const SUBSCRIBE_MESSAGES = {
  off: 'Ежедневная рассылка выключена. Карту дня в любой момент — кнопкой «На день».',
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
  rejected: 'Не удалось активировать код. Проверь написание или запроси новый у администратора.',
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
  const spreadQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.spread);
  const deepQ = quotedSpreadLabel(SPREAD_BUTTON_LABEL.deep);
  return `<b>Готово</b>, промокод принят. ⭐️ <b>Premium</b> на месяц (до ${dateRu}) — доступны ${spreadQ} и полная ${deepQ}.`;
}

export function startTextHtml(opts: SpreadAccessOverviewOpts): string {
  return `Привет, я <b>Водоворот</b>. Ниже — расклады от простых к сложным.

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
    /^\/menu(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/help(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/status(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/promo(?:@\S+)?(?:\s|$)/i.test(t) ||
    /^\/pushtime(?:@\S+)?(?:\s|$)/i.test(t)
  );
}
