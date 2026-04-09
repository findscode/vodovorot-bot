import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import {
  ACCESS_DENIED_MESSAGE,
  DAY_LIMIT_MESSAGE,
  helpTextHtml,
  isPublicEntryCommand,
  menuTextFull,
  menuTextLimited,
  startTextFull,
  startTextLimited,
} from './botCopy.js';
import { hasFullBotAccess, loadOptionalAccessWhitelist } from './accessWhitelist.js';
import { getDayDrawStatePath, tryConsumeDayDrawSlot, utcCalendarDate } from './dayDrawState.js';
import { drawOne, drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from './deck.js';
import { completeChat } from './ai.js';
import { cardOfDayPrompt, pastPresentFuturePrompt } from './prompts.js';
import { cardImageExists } from './cardAssets.js';
import { cardPhotoInput } from './cardPhotoInput.js';
import { spreadCompositePhotoInput } from './spreadComposite.js';
import { formatReadingForTelegram, TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { withTypingWhile } from './typingIndicator.js';

const TG_MAX = 4096;
const TG_CAPTION_MAX = 1024;

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

if (accessWhitelist !== null) {
  console.log(
    `Whitelist: полный доступ у ${accessWhitelist.size} user id; остальные — только «карта дня» (лимит 1×/сутки UTC). Состояние: ${getDayDrawStatePath()}`,
  );
} else {
  console.log(`Лимит «карта дня» (UTC), файл состояния: ${getDayDrawStatePath()}`);
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
    try {
      await ctx.answerCbQuery('Нет доступа.', { show_alert: false });
    } catch {
      /* уже отвечали или запрос устарел */
    }
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

bot.action('day', async (ctx) => {
  await ctx.answerCbQuery();
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  const today = utcCalendarDate();
  const slotOk = await tryConsumeDayDrawSlot(uid, today);
  if (!slotOk) {
    await ctx.reply(DAY_LIMIT_MESSAGE);
    return;
  }

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
    for (const chunk of splitForTelegram(text)) {
      await ctx.reply(formatReadingForTelegram(chunk), TELEGRAM_HTML_PARSE);
    }
  } catch (e) {
    logHandlerError('day', e);
    await ctx.reply('Сейчас текст не удалось получить. Попробуй ещё раз чуть позже.');
  }
});

bot.action('spread', async (ctx) => {
  await ctx.answerCbQuery();
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
    for (const chunk of splitForTelegram(text)) {
      await ctx.reply(formatReadingForTelegram(chunk), TELEGRAM_HTML_PARSE);
    }
  } catch (e) {
    logHandlerError('spread', e);
    await ctx.reply('Сейчас текст не удалось получить. Попробуй ещё раз чуть позже.');
  }
});

bot.launch().then(() => console.log('Слушаю Telegram.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
