import type { Telegraf } from 'telegraf';
import { getOrCreateUser } from '../db/usersRepo.js';
import { launchReadingFromWebApp } from '../readingLaunch.js';
import { readingContextFromPrivateChat } from '../readingLaunchContext.js';
import { deliverWhatsNewIfNeededViaTelegram } from '../releaseNotesDelivery.js';
import { logHandlerError } from '../handlers/botHelpers.js';
import type { WebAppLaunchAction } from './webappLaunchPayload.js';

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
    throw e;
  }
}
