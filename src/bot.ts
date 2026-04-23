import 'dotenv/config';
import type { Context } from 'telegraf';
import { Telegraf, Markup } from 'telegraf';
import {
  ACCESS_DENIED_MESSAGE,
  DAY_LIMIT_MESSAGE,
  helpTextHtml,
  isPublicEntryCommand,
  LAST_EMPTY_MESSAGE,
  menuTextFull,
  menuTextLimited,
  startTextFull,
  startTextLimited,
} from './botCopy.js';
import { hasFullBotAccess, loadOptionalAccessWhitelist } from './accessWhitelist.js';
import {
  getDayDrawStatePath,
  getDayDrawTimezone,
  hasDayDrawSlotUsed,
  moscowCalendarDate,
  tryConsumeDayDrawSlot,
} from './dayDrawState.js';
import { drawOne, drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt, pastPresentFuturePrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { cardPhotoInput } from './cardPhotoInput.js';
import { spreadCompositePhotoInput } from './spreadComposite.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { withTypingWhile } from './typingIndicator.js';
import { getLastReading, saveLastReading } from './lastReadingStore.js';

const TG_MAX = 4096;
const TG_CAPTION_MAX = 1024;
const DAY_ACTION_DEBOUNCE_MS = 2500;

const dayLastTap = new Map<number, number>();
const dayInFlight = new Set<number>();

function splitForTelegram(text: string): string[] {
  if (text.length <= TG_MAX) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= TG_MAX) {
      parts.push(rest);
      break;
    }
    let cut = rest.lastIndexOf('\n\n', TG_MAX);
    if (cut < TG_MAX / 2) cut = rest.lastIndexOf(' ', TG_MAX);
    if (cut < TG_MAX / 2) cut = TG_MAX;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return parts;
}

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
    const kb = last ? keyboardFor(ctx) : {};
    await ctx.reply(formatted[i], { ...kb, ...TELEGRAM_HTML_PARSE });
  }
  if (formatted.length > 0) {
    saveLastReading(userId, formatted.join('\n\n'));
  }
}

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('В .env нет BOT_TOKEN');
  process.exit(1);
}

let accessWhitelist: Set<number> | null;
try {
  accessWhitelist = loadOptionalAccessWhitelist();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const bot = new Telegraf(token);

/** Только личные чаты: в группах и каналах не отвечаем и не обрабатываем расклады. */
bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  if (chatType !== undefined && chatType !== 'private') {
    return;
  }
  return next();
});

const tzLabel = getDayDrawTimezone();
if (accessWhitelist !== null) {
  console.log(
    `Whitelist: полный доступ у ${accessWhitelist.size} user id; остальные — только «карта дня» (лимит 1×/сутки, дата по ${tzLabel}). Состояние: ${getDayDrawStatePath()}`,
  );
} else {
  console.log(`Лимит «карта дня» (календарная дата в ${tzLabel}), файл: ${getDayDrawStatePath()}`);
}

bot.use(async (ctx, next) => {
  if (accessWhitelist === null) {
    return next();
  }
  const uid = ctx.from?.id;
  if (hasFullBotAccess(accessWhitelist, uid)) {
    return next();
  }
  const cq = ctx.callbackQuery;
  if (cq && 'data' in cq && cq.data === 'day') {
    return next();
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
    await answerCbQuerySafe(ctx, 'Нет доступа.', false);
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

const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('На день', 'day')],
  [Markup.button.callback('Прошлое — настоящее — будущее', 'spread')],
]);

const dayOnlyKeyboard = Markup.inlineKeyboard([[Markup.button.callback('На день', 'day')]]);

function keyboardFor(ctx: { from?: { id: number } }) {
  return hasFullBotAccess(accessWhitelist, ctx.from?.id) ? mainKeyboard : dayOnlyKeyboard;
}

bot.start(async (ctx) => {
  const full = hasFullBotAccess(accessWhitelist, ctx.from?.id);
  const text = full ? startTextFull() : startTextLimited();
  await ctx.reply(text, { ...keyboardFor(ctx), ...TELEGRAM_HTML_PARSE });
});

bot.command('menu', async (ctx) => {
  const full = hasFullBotAccess(accessWhitelist, ctx.from?.id);
  const text = full ? menuTextFull() : menuTextLimited();
  await ctx.reply(text, { ...keyboardFor(ctx), ...TELEGRAM_HTML_PARSE });
});

bot.command('help', async (ctx) => {
  const full = hasFullBotAccess(accessWhitelist, ctx.from?.id);
  await ctx.reply(helpTextHtml({ fullAccess: full }), {
    ...keyboardFor(ctx),
    ...TELEGRAM_HTML_PARSE,
  });
});

bot.command('last', async (ctx) => {
  const uid = ctx.from?.id;
  if (uid === undefined) return;
  const text = getLastReading(uid);
  if (!text) {
    await ctx.reply(LAST_EMPTY_MESSAGE, { ...keyboardFor(ctx), ...TELEGRAM_HTML_PARSE });
    return;
  }
  const parts = splitForTelegram(text);
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const kb = last ? keyboardFor(ctx) : {};
    await ctx.reply(parts[i], { ...kb, ...TELEGRAM_HTML_PARSE });
  }
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
    const drawn = drawOne();
    const line = `День: ${formatDrawnLine(drawn)}`;

    if (cardImageExists(drawn.card.id)) {
      const photo = await cardPhotoInput(drawn.card.id, drawn.reversed);
      await ctx.replyWithPhoto(photo, {
        caption: line.slice(0, TG_CAPTION_MAX),
      });
    } else {
      await ctx.reply(
        `${line}\n\nКартинку карты сейчас не показать — толкование всё равно пришлю ниже.`,
      );
    }

    const voice = drawVoiceArchetype();
    await ctx.reply('Секунду, собираю текст толкования…');
    try {
      const text = await withTypingWhile(ctx, () => completeChat(cardOfDayPrompt(drawn, voice)));
      await sendReadingChunks(ctx, text, uid);
      const reserved = await tryConsumeDayDrawSlot(uid, today);
      if (!reserved) {
        console.warn('[day] слот не зарезервирован после успеха (гонка или рассинхрон файла)');
      }
    } catch (e) {
      logHandlerError('day', e);
      await ctx.reply('Сейчас текст не удалось получить. Попробуй ещё раз чуть позже.');
    }
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
    await ctx.reply(
      `${header}\n\nКартинки карт сейчас недоступны — ниже пришлю толкование по тексту расклада.`,
    );
  }

  const voice = drawVoiceArchetype();
  await ctx.reply('Секунду, собираю текст толкования…');
  try {
    const text = await withTypingWhile(ctx, () =>
      completeChat(pastPresentFuturePrompt(cards, voice)),
    );
    await sendReadingChunks(ctx, text, uid);
  } catch (e) {
    logHandlerError('spread', e);
    await ctx.reply('Сейчас текст не удалось получить. Попробуй ещё раз чуть позже.');
  }
});

bot.launch().then(() => console.log('Слушаю Telegram.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
