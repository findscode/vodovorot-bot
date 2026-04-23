import 'dotenv/config';
import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { initDatabase } from './db/database.js';
import { migrateLegacyDayDrawJsonIfNeeded } from './db/migrateLegacyDayDraw.js';
import { seedAdminsFromEnv } from './db/seedAdmins.js';
import {
  accessDeniedMessage,
  AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE,
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DAY_DEBOUNCE_MESSAGE,
  DAY_IN_FLIGHT_MESSAGE,
  dayLimitMessage,
  helpTextHtml,
  isPublicEntryCommand,
  LAST_EMPTY_MESSAGE,
  menuTextFull,
  menuTextLimited,
  PROMO_MESSAGES,
  PUSHTIME_INVALID_FORMAT_HTML,
  PUSHTIME_NEED_SUBSCRIPTION_HTML,
  PUSHTIME_PICK_PROMPT_HTML,
  pushtimeSavedMessageHtml,
  SPREAD_DONE_HINT,
  SPREAD_IMAGES_UNAVAILABLE_SUFFIX,
  startTextFull,
  startTextLimited,
  SUBSCRIBE_MESSAGES,
  subscribeEnabledMessageHtml,
  WHITELIST_NO_SPREAD_ACCESS_CALLBACK,
} from './botCopy.js';
import { loadOptionalAccessWhitelist } from './accessWhitelist.js';
import { setAccessWhitelist } from './runtimeConfig.js';
import { hasFullSpreadAccess } from './accessResolve.js';
import {
  getDayDrawTimezone,
  getDayDrawStatePath,
  hasDayDrawSlotUsed,
  moscowCalendarDate,
} from './dayDrawState.js';
import { drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { pastPresentFuturePrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { spreadCompositePhotoInput } from './spreadComposite.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { withTypingWhile } from './typingIndicator.js';
import { getLastReading, saveLastReading } from './lastReadingStore.js';
import { getDatabasePath } from './db/database.js';
import { deliverCardOfDayReading } from './cardOfDayDelivery.js';
import { isAllowedDayPushHhmm, normalizeDayPushHhmm } from './dayPushPresets.js';
import {
  DAY_PUSH_TIME_MENU_CALLBACK,
  keyboardDayPushTimePresets,
  keyboardMainOrDayOnly,
  keyboardMainOrDayPlusDayPushShortcut,
} from './botKeyboards.js';
import {
  getDayPushScheduleForUserSync,
  isDayPushEnabledSync,
  setDayPushEnabled,
  setDayPushLocalHhmmSync,
  tryRedeemPromoCodeSync,
} from './db/usersRepo.js';
import { startDayPushScheduler } from './dayPushScheduler.js';
import { getDefaultDayPushHhmm } from './dayPushConfig.js';
import { splitForTelegram } from './telegramChunks.js';
import { statusTextHtml } from './statusCopy.js';

const TG_CAPTION_MAX = 1024;
const DAY_ACTION_DEBOUNCE_MS = 2500;

const dayLastTap = new Map<number, number>();
const dayInFlight = new Set<number>();

initDatabase();
migrateLegacyDayDrawJsonIfNeeded();
seedAdminsFromEnv();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('В .env нет BOT_TOKEN');
  process.exit(1);
}

let accessWhitelist: ReturnType<typeof loadOptionalAccessWhitelist>;
try {
  accessWhitelist = loadOptionalAccessWhitelist();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
setAccessWhitelist(accessWhitelist);

const bot = new Telegraf(token);

/** Ответ на callback без шума в логах, если запрос устарел или уже закрыт. */
async function answerCbQuerySafe(ctx: Context, text?: string, showAlert = false): Promise<void> {
  try {
    if (text !== undefined) {
      await ctx.answerCbQuery(text, { show_alert: showAlert });
    } else {
      await ctx.answerCbQuery();
    }
  } catch {
    /* ignore */
  }
}

function dayPushHhmmArgFromMessageText(text: string): string | undefined {
  const m = /^\/pushtime(?:@\S+)?(?:\s+(.*))?$/i.exec(text.trim());
  const rest = m?.[1]?.trim();
  if (!rest) return undefined;
  return rest.split(/\s+/)[0];
}

async function sendReadingChunks(ctx: Context, rawText: string, userId: number): Promise<void> {
  const parts = splitForTelegram(rawText);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    const body = last ? `${formatted[i]}\n\n${SPREAD_DONE_HINT}` : formatted[i];
    const kb = last ? keyboardMainOrDayOnly(userId) : {};
    await ctx.reply(body, { ...kb, ...TELEGRAM_HTML_PARSE });
  }
  if (formatted.length > 0) {
    saveLastReading(userId, rawText);
  }
}

const tzLabel = getDayDrawTimezone();
const dbPath = getDatabasePath();
if (accessWhitelist !== null) {
  console.log(
    `Whitelist: полный доступ у ${accessWhitelist.size} user id; остальные — только «карта день» (лимит 1×/сутки по ${tzLabel}). БД: ${dbPath}; legacy JSON (если был): ${getDayDrawStatePath()}`,
  );
} else {
  console.log(`Лимит «карта дня» (дата в ${tzLabel}), БД: ${dbPath}`);
}

/** Только личные чаты: в группах и каналах не отвечаем и не обрабатываем расклады. */
bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  if (chatType !== undefined && chatType !== 'private') {
    return;
  }
  return next();
});

bot.use(async (ctx, next) => {
  if (accessWhitelist === null) {
    return next();
  }
  const uid = ctx.from?.id;
  if (hasFullSpreadAccess(uid)) {
    return next();
  }
  const cq = ctx.callbackQuery;
  if (cq && 'data' in cq) {
    const d = cq.data;
    if (
      d === 'day' ||
      d === 'day_sub_on' ||
      d === 'day_sub_off' ||
      d === DAY_PUSH_TIME_MENU_CALLBACK ||
      /^pt:\d{2}:\d{2}$/.test(d)
    ) {
      return next();
    }
  }
  if (ctx.message && 'text' in ctx.message && isPublicEntryCommand(ctx.message.text)) {
    return next();
  }
  if (uid !== undefined) {
    console.log(`[whitelist] отклонён user id ${uid} (не полный доступ)`);
  } else {
    console.log('[whitelist] отклонено обновление без ctx.from');
  }
  if (ctx.callbackQuery) {
    await answerCbQuerySafe(ctx, WHITELIST_NO_SPREAD_ACCESS_CALLBACK, false);
    return;
  }
  if (ctx.message) {
    await ctx.reply(accessDeniedMessage(), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  }
});

function logHandlerError(label: string, e: unknown): void {
  if (e instanceof Error) {
    console.error(`[${label}]`, e.name, e.message);
    if (e.cause instanceof Error) {
      console.error(`[${label}] cause:`, e.cause.message);
    }
  } else {
    console.error(`[${label}]`, e);
  }
}

bot.start(async (ctx) => {
  const full = hasFullSpreadAccess(ctx.from?.id);
  const text = full ? startTextFull() : startTextLimited();
  await ctx.reply(text, { ...keyboardMainOrDayOnly(ctx.from?.id), ...TELEGRAM_HTML_PARSE });
});

bot.command('menu', async (ctx) => {
  const full = hasFullSpreadAccess(ctx.from?.id);
  const text = full ? menuTextFull() : menuTextLimited();
  await ctx.reply(text, { ...keyboardMainOrDayOnly(ctx.from?.id), ...TELEGRAM_HTML_PARSE });
});

bot.command('help', async (ctx) => {
  const full = hasFullSpreadAccess(ctx.from?.id);
  await ctx.reply(helpTextHtml({ fullAccess: full }), {
    ...keyboardMainOrDayOnly(ctx.from?.id),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.command('status', async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  await ctx.reply(statusTextHtml(uid), {
    ...keyboardMainOrDayOnly(uid),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.command('pushtime', async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  if (!isDayPushEnabledSync(uid)) {
    await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }
  const text =
    ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string'
      ? ctx.message.text
      : '';
  const arg = dayPushHhmmArgFromMessageText(text);
  if (arg !== undefined) {
    const hhmm = normalizeDayPushHhmm(arg);
    if (!hhmm) {
      await ctx.reply(PUSHTIME_INVALID_FORMAT_HTML, {
        ...keyboardDayPushTimePresets(),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    if (!setDayPushLocalHhmmSync(uid, hhmm)) {
      await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
      return;
    }
    const row = getDayPushScheduleForUserSync(uid);
    const tz = row?.timezoneIana ?? getDayDrawTimezone();
    const kbAfterPushtime = isDayPushEnabledSync(uid)
      ? keyboardMainOrDayPlusDayPushShortcut(uid)
      : keyboardMainOrDayOnly(uid);
    await ctx.reply(pushtimeSavedMessageHtml(hhmm, tz), { ...kbAfterPushtime, ...TELEGRAM_HTML_PARSE });
    return;
  }
  await ctx.reply(PUSHTIME_PICK_PROMPT_HTML, {
    ...keyboardDayPushTimePresets(),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.command('last', async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  const text = getLastReading(uid);
  if (!text) {
    await ctx.reply(LAST_EMPTY_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }
  const parts = splitForTelegram(text);
  for (let i = 0; i < parts.length; i++) {
    await ctx.reply(formatReadingForTelegram(parts[i]), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  }
});

bot.command('promo', async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  const text =
    ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string'
      ? ctx.message.text.trim()
      : '';
  const code = text.split(/\s+/).slice(1).join(' ').trim();
  if (!code) {
    await ctx.reply(PROMO_MESSAGES.needCode, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
    return;
  }
  const r = tryRedeemPromoCodeSync(uid, code);
  const msg =
    r === 'ok'
      ? PROMO_MESSAGES.ok
      : r === 'used'
        ? PROMO_MESSAGES.used
        : r === 'expired'
          ? PROMO_MESSAGES.expired
          : PROMO_MESSAGES.invalid;
  await ctx.reply(msg, { ...keyboardMainOrDayOnly(uid), ...TELEGRAM_HTML_PARSE });
});

bot.action('day_sub_on', async (ctx) => {
  await answerCbQuerySafe(ctx);
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  const tz = getDayDrawTimezone();
  const hhmm = getDefaultDayPushHhmm();
  setDayPushEnabled(uid, true, tz, hhmm);
  await ctx.reply(subscribeEnabledMessageHtml(hhmm, tz), {
    ...keyboardMainOrDayPlusDayPushShortcut(uid),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.action(DAY_PUSH_TIME_MENU_CALLBACK, async (ctx) => {
  await answerCbQuerySafe(ctx);
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  if (!isDayPushEnabledSync(uid)) {
    await ctx.reply(PUSHTIME_NEED_SUBSCRIPTION_HTML, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }
  await ctx.reply(PUSHTIME_PICK_PROMPT_HTML, {
    ...keyboardDayPushTimePresets(),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.action(/^pt:(\d{2}:\d{2})$/, async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  const hhmm = ctx.match?.[1];
  if (!hhmm || !isAllowedDayPushHhmm(hhmm)) {
    await answerCbQuerySafe(ctx, 'Это время недоступно.', true);
    return;
  }
  const ok = setDayPushLocalHhmmSync(uid, hhmm);
  if (!ok) {
    await answerCbQuerySafe(ctx, 'Сначала включи рассылку.', true);
    return;
  }
  await answerCbQuerySafe(ctx);
  const row = getDayPushScheduleForUserSync(uid);
  const tz = row?.timezoneIana ?? getDayDrawTimezone();
  const kb = isDayPushEnabledSync(uid)
    ? keyboardMainOrDayPlusDayPushShortcut(uid)
    : keyboardMainOrDayOnly(uid);
  await ctx.reply(pushtimeSavedMessageHtml(hhmm, tz), { ...kb, ...TELEGRAM_HTML_PARSE });
});

bot.action('day_sub_off', async (ctx) => {
  await answerCbQuerySafe(ctx);
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  setDayPushEnabled(uid, false, getDayDrawTimezone());
  await ctx.reply(SUBSCRIBE_MESSAGES.off, {
    ...keyboardMainOrDayOnly(uid),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.action('day', async (ctx) => {
  await answerCbQuerySafe(ctx);
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  if (dayInFlight.has(uid)) {
    await ctx.reply(DAY_IN_FLIGHT_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }

  const now = Date.now();
  const prevTap = dayLastTap.get(uid) ?? 0;
  if (now - prevTap < DAY_ACTION_DEBOUNCE_MS) {
    await ctx.reply(DAY_DEBOUNCE_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }
  dayLastTap.set(uid, now);

  const today = moscowCalendarDate();
  if (await hasDayDrawSlotUsed(uid, today)) {
    await ctx.reply(dayLimitMessage(), {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
    return;
  }
  dayInFlight.add(uid);

  try {
    const result = await deliverCardOfDayReading(
      ctx.telegram,
      uid,
      'manual',
      (task) => withTypingWhile(ctx, task),
    );
    if (result === 'ai_error') {
      await ctx.reply(AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    } else if (result === 'slot_race') {
      console.warn('[day] слот не зарезервирован после успеха (гонка)');
    }
  } catch (e) {
    logHandlerError('day', e);
    await ctx.reply(AI_TEXT_UNAVAILABLE_AFTER_CARD_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  } finally {
    dayInFlight.delete(uid);
  }
});

bot.action('spread', async (ctx) => {
  await answerCbQuerySafe(ctx);
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  const cards = drawThreeUnique();
  const positions = ['Прошлое', 'Настоящее', 'Будущее'] as const;
  const lines = cards.map((d, i) => `${positions[i]}: ${formatDrawnLine(d)}`);
  const header = ['Прошлое, настоящее, будущее.', ...lines].join('\n');

  const allExist = cards.every((d) => cardImageExists(d.card.id));

  if (allExist) {
    const cap =
      header.length <= TG_CAPTION_MAX ? header : `${lines.join(' · ')}`.slice(0, TG_CAPTION_MAX);
    const photo = await spreadCompositePhotoInput(cards);
    await ctx.replyWithPhoto(photo, { caption: cap });
  } else {
    await ctx.reply(`${header}\n\n${SPREAD_IMAGES_UNAVAILABLE_SUFFIX}`);
  }

  const voice = drawVoiceArchetype();
  try {
    const text = await withTypingWhile(ctx, () =>
      completeChat(pastPresentFuturePrompt(cards, voice)),
    );
    await sendReadingChunks(ctx, text, uid);
  } catch (e) {
    logHandlerError('spread', e);
    await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE, {
      ...keyboardMainOrDayOnly(uid),
      ...TELEGRAM_HTML_PARSE,
    });
  }
});

bot.launch().then(() => {
  console.log('Слушаю Telegram.');
  startDayPushScheduler(bot);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
