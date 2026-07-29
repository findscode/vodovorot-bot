import type { Telegraf } from 'telegraf';
import { getOrCreateUser } from '../db/usersRepo.js';
import { launchReadingFromWebApp } from '../readingLaunch.js';
import { readingContextFromPrivateChat } from '../readingLaunchContext.js';
import { deliverWhatsNewIfNeededViaTelegram } from '../releaseNotesDelivery.js';
import { logHandlerError } from '../handlers/botHelpers.js';
import type { WebAppLaunchAction } from './webappLaunchPayload.js';
import { WEBAPP_LAUNCH_ERROR_HTML } from '../botCopy.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';

/** Запуск расклада из Mini App по HTTP (Menu Button не доставляет sendData в бот). */
export async function runWebAppReadingLaunch(
  telegram: Telegraf['telegram'],
  userId: number,
  action: WebAppLaunchAction,
): Promise<void> {
  getOrCreateUser(userId);
  try {
    await deliverWhatsNewIfNeededViaTelegram(telegram, userId);
    const ctx = readingContextFromPrivateChat(telegram, userId);
    await launchReadingFromWebApp(ctx, userId, action);
  } catch (e) {
    logHandlerError('webapp_launch', e);
    try {
      await telegram.sendMessage(userId, WEBAPP_LAUNCH_ERROR_HTML, TELEGRAM_HTML_PARSE);
    } catch (replyError) {
      logHandlerError('webapp_launch_reply', replyError);
    }
    throw e;
  }
}
