import type { Telegraf } from 'telegraf';

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
