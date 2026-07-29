import type { Telegraf } from 'telegraf';
import { AI_LONG_WAIT_MESSAGE } from './botCopy.js';

type MinimalCtx = {
  telegram: Telegraf['telegram'];
  chat?: { id: number };
};

const TYPING_INTERVAL_MS = 4500;
const LONG_WAIT_NOTICE_MS = 20_000;

function scheduleLongWaitNotice(
  telegram: Telegraf['telegram'],
  chatId: number,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    void telegram.sendMessage(chatId, AI_LONG_WAIT_MESSAGE).catch(() => {});
  }, LONG_WAIT_NOTICE_MS);
}

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
  const notice = scheduleLongWaitNotice(ctx.telegram, chatId);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
    clearTimeout(notice);
  }
}

/** Для рассылки без `ctx` (например «карта дня» по подписке). */
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
  const notice = scheduleLongWaitNotice(telegram, chatId);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
    clearTimeout(notice);
  }
}
