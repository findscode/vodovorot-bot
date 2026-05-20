import type { Context } from 'telegraf';

/** Ответ на callback без шума в логах, если запрос устарел или уже закрыт. */
export async function answerCbQuerySafe(
  ctx: Context,
  text?: string,
  showAlert = false,
): Promise<void> {
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

export function dayPushHhmmArgFromMessageText(text: string): string | undefined {
  const m = /^\/pushtime(?:@\S+)?(?:\s+(.*))?$/i.exec(text.trim());
  const rest = m?.[1]?.trim();
  if (!rest) return undefined;
  return rest.split(/\s+/)[0];
}

export function logHandlerError(label: string, e: unknown): void {
  if (e instanceof Error) {
    console.error(`[${label}]`, e.name, e.message);
    if (e.cause instanceof Error) {
      console.error(`[${label}] cause:`, e.cause.message);
    }
  } else {
    console.error(`[${label}]`, e);
  }
}
