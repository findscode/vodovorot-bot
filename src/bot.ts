import 'dotenv/config';
import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { initDatabase } from './db/database.js';
import { migrateLegacyDayDrawJsonIfNeeded } from './db/migrateLegacyDayDraw.js';
import { seedAdminsFromEnv } from './db/seedAdmins.js';
import {
  ACCESS_DENIED_MESSAGE,
  AI_TEXT_UNAVAILABLE_MESSAGE,
  DAY_LIMIT_MESSAGE,
  helpTextHtml,
  isPublicEntryCommand,
  LAST_EMPTY_MESSAGE,
  menuTextFull,
  menuTextLimited,
  PROMO_MESSAGES,
  READING_BUILDING_MESSAGE,
  SPREAD_IMAGES_UNAVAILABLE_SUFFIX,
  startTextFull,
  startTextLimited,
  SUBSCRIBE_MESSAGES,
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
import { keyboardMainOrDayOnly } from './botKeyboards.js';
import { setDayPushEnabled, tryRedeemPromoCodeSync } from './db/usersRepo.js';
import { startDayPushScheduler } from './dayPushScheduler.js';
import { getDefaultDayPushHhmm } from './dayPushConfig.js';
import { splitForTelegram } from './telegramChunks.js';

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

async function sendReadingChunks(ctx: Context, rawText: string, userId: number): Promise<void> {
  const parts = splitForTelegram(rawText);
  const formatted = parts.map((c) => formatReadingForTelegram(c));
  for (let i = 0; i < formatted.length; i++) {
    const last = i === formatted.length - 1;
    const kb = last ? keyboardMainOrDayOnly(userId) : {};
    await ctx.reply(formatted[i], { ...kb, ...TELEGRAM_HTML_PARSE });
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
    if (d === 'day' || d === 'day_sub_on' || d === 'day_sub_off') {
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
    await ctx.reply(ACCESS_DENIED_MESSAGE);
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
    const last = i === parts.length - 1;
    const kb = last ? keyboardMainOrDayOnly(uid) : {};
    await ctx.reply(formatReadingForTelegram(parts[i]), { ...kb, ...TELEGRAM_HTML_PARSE });
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
  setDayPushEnabled(uid, true, getDayDrawTimezone(), getDefaultDayPushHhmm());
  await ctx.reply(SUBSCRIBE_MESSAGES.on, {
    ...keyboardMainOrDayOnly(uid),
    ...TELEGRAM_HTML_PARSE,
  });
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

  const now = Date.now();
  const prevTap = dayLastTap.get(uid) ?? 0;
  if (now - prevTap < DAY_ACTION_DEBOUNCE_MS) {
    return;
  }
  dayLastTap.set(uid, now);

  const today = moscowCalendarDate();
  if (await hasDayDrawSlotUsed(uid, today)) {
    await ctx.reply(DAY_LIMIT_MESSAGE);
    return;
  }
  if (dayInFlight.has(uid)) {
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
      await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE);
    } else if (result === 'slot_race') {
      console.warn('[day] слот не зарезервирован после успеха (гонка)');
    }
  } catch (e) {
    logHandlerError('day', e);
    await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE);
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
  await ctx.reply(READING_BUILDING_MESSAGE);
  try {
    const text = await withTypingWhile(ctx, () =>
      completeChat(pastPresentFuturePrompt(cards, voice)),
    );
    await sendReadingChunks(ctx, text, uid);
  } catch (e) {
    logHandlerError('spread', e);
    await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE);
  }
});

bot.launch().then(() => {
  console.log('Слушаю Telegram.');
  startDayPushScheduler(bot);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
