import type { Telegraf } from 'telegraf';
import {
  createTelegramDraftStreamer,
  noopProgress,
  type DraftMode,
  type ReadingProgress,
} from './readingDraft.js';

type MinimalCtx = {
  telegram: Telegraf['telegram'];
  chat?: { id: number };
};

const TYPING_INTERVAL_MS = 4500;

/**
 * Пока выполняется `fn`, периодически шлёт chat action «печатает…» (лимит Telegram ~5 с на действие).
 */
export async function withTypingWhile<T>(ctx: MinimalCtx, fn: () => Promise<T>): Promise<T> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    return fn();
  }
  const tick = (): void => {
    void ctx.telegram.sendChatAction(chatId, 'typing').catch(() => {});
  };
  tick();
  const interval = setInterval(tick, TYPING_INTERVAL_MS);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
}

/**
 * «Печатает…» и потоковый черновик ответа: пока ИИ пишет толкование, пользователь видит текст.
 * Если черновики недоступны, остаётся только «печатает…».
 */
export async function withReadingProgress(
  ctx: MinimalCtx,
  mode: DraftMode,
  task: (onProgress: ReadingProgress) => Promise<string>,
): Promise<string> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    return task(noopProgress);
  }
  return withTypingWhile(ctx, async () => {
    const streamer = createTelegramDraftStreamer(ctx.telegram, chatId, mode);
    streamer?.start();
    try {
      return await task((raw) => streamer?.push(raw));
    } finally {
      streamer?.stop();
    }
  });
}

/** Для рассылки без `ctx` (например «карта дня» по подписке): без черновика, человек не ждёт у экрана. */
export async function withTelegramTypingWhile<T>(
  telegram: Telegraf['telegram'],
  chatId: number,
  fn: () => Promise<T>,
): Promise<T> {
  const tick = (): void => {
    void telegram.sendChatAction(chatId, 'typing').catch(() => {});
  };
  tick();
  const interval = setInterval(tick, TYPING_INTERVAL_MS);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
}
