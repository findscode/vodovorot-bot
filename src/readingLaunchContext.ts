import type { Context, Telegraf } from 'telegraf';

/** Минимальный контекст для запуска расклада из чата или HTTP API. */
export type ReadingLaunchContext = {
  telegram: Telegraf['telegram'];
  chat: { id: number };
  reply(text: string, extra?: Record<string, unknown>): Promise<unknown>;
};

export function readingContextFromPrivateChat(
  telegram: Telegraf['telegram'],
  userId: number,
): ReadingLaunchContext {
  return {
    telegram,
    chat: { id: userId },
    reply(text, extra) {
      return telegram.sendMessage(userId, text, extra);
    },
  };
}

export function readingContextFromTelegraf(ctx: Context): ReadingLaunchContext | null {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return null;
  return {
    telegram: ctx.telegram,
    chat: { id: chatId },
    reply(text, extra) {
      return ctx.reply(text, extra);
    },
  };
}
