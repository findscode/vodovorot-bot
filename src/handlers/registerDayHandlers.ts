import type { Telegraf } from 'telegraf';
import { launchDayReading } from '../readingLaunch.js';
import { answerCbQuerySafe } from './botHelpers.js';

export function registerDayHandlers(bot: Telegraf): void {
  bot.action('day', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    await launchDayReading(ctx, uid);
  });
}
