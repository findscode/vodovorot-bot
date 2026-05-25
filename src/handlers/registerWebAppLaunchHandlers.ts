import type { Telegraf } from 'telegraf';
import { getOrCreateUser } from '../db/usersRepo.js';
import { parseWebAppLaunchPayload } from '../webapp/webappLaunchPayload.js';
import { deliverWhatsNewIfNeeded } from '../releaseNotesDelivery.js';
import { launchReadingFromWebApp } from '../readingLaunch.js';
import { logHandlerError } from './botHelpers.js';

/** Запуск раскладов из Mini App через `sendData` (#4.4). */
export function registerWebAppLaunchHandlers(bot: Telegraf): void {
  bot.on('message', async (ctx, next) => {
    const msg = ctx.message;
    if (!msg || !('web_app_data' in msg) || !msg.web_app_data?.data) {
      return next();
    }

    const uid = ctx.from?.id;
    if (uid === undefined) return;

    getOrCreateUser(uid);
    await deliverWhatsNewIfNeeded(ctx, uid);

    const action = parseWebAppLaunchPayload(msg.web_app_data.data);
    if (!action) {
      return next();
    }

    try {
      await launchReadingFromWebApp(ctx, uid, action);
    } catch (e) {
      logHandlerError('web_app_launch', e);
    }
  });
}
