import type { Telegraf } from 'telegraf';
import { launchDayReading } from '../readingLaunch.js';
import { readingContextFromTelegraf } from '../readingLaunchContext.js';
import { answerCbQuerySafe } from './botHelpers.js';

export function registerDayHandlers(bot: Telegraf): void {
  bot.action('day', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    const launchCtx = readingContextFromTelegraf(ctx);
    if (!launchCtx) return;
    await launchDayReading(launchCtx, uid);
  });
}
