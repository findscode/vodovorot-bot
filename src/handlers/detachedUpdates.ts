import type { Context, MiddlewareFn, Telegraf } from 'telegraf';

export type DetachedErrorHandler = (err: unknown, ctx: Context) => Promise<void> | void;

/**
 * Запускает цепочку обработчиков и сразу возвращает управление.
 *
 * Telegraf в режиме polling ждёт завершения всей пачки апдейтов перед следующим `getUpdates`.
 * Пока один пользователь ждёт ответ ИИ (до минут), бот не видит ни «Отмена»,
 * ни апдейты других людей. Отсоединённый запуск снимает эту блокировку;
 * защита от гонок — in-flight и id сессий.
 */
export function detachUpdate(
  ctx: Context,
  next: () => Promise<void>,
  onError: DetachedErrorHandler,
): void {
  void next().catch(async (err: unknown) => {
    try {
      await onError(err, ctx);
    } catch (handlerErr) {
      console.error('[detached_update] error handler failed', handlerErr);
    }
  });
}

/** Первым в цепочке: апдейты не блокируют друг друга; ошибки идут в общий обработчик. */
export function registerDetachedUpdates(bot: Telegraf, onError: DetachedErrorHandler): void {
  const middleware: MiddlewareFn<Context> = (ctx, next) => {
    detachUpdate(ctx, next, onError);
    return Promise.resolve();
  };
  bot.use(middleware);
}
