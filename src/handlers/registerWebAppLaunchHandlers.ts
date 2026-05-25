import type { Telegraf } from 'telegraf';
import { getOrCreateUser } from '../db/usersRepo.js';
import { parseWebAppLaunchPayload } from '../webapp/webappLaunchPayload.js';
import { deliverWhatsNewIfNeeded } from '../releaseNotesDelivery.js';
import { readingContextFromTelegraf } from '../readingLaunchContext.js';
import { launchReadingFromWebApp } from '../readingLaunch.js';
import { logHandlerError } from './botHelpers.js';

/**
 * Запасной путь: `sendData` из Mini App (только Reply Keyboard WebApp).
 * Основной запуск — POST `/api/webapp/launch` из Menu Button (#4.4 fix).
 */
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

    const launchCtx = readingContextFromTelegraf(ctx);
    if (!launchCtx) return;

    try {
      await launchReadingFromWebApp(launchCtx, uid, action);
    } catch (e) {
      logHandlerError('web_app_launch', e);
    }
  });
}
