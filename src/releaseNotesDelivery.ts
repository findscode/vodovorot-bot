import type { Context, Telegraf } from 'telegraf';
import { keyboardWhatsNewDismiss } from './botKeyboards.js';
import { hasActiveDeepSession } from './deepReading/sessionStore.js';
import { getLastSeenReleaseSync, getOrCreateUser, markReleaseSeenSync } from './db/usersRepo.js';
import { TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { APP_RELEASE_VERSION, shouldShowWhatsNew, whatsNewHtml } from './releaseNotes.js';
import { hasActiveSpreadSession } from './spreadSessionStore.js';

type WhatsNewReply = (text: string, extra?: Record<string, unknown>) => Promise<unknown>;

async function deliverWhatsNewCore(userId: number, reply: WhatsNewReply): Promise<boolean> {
  if (hasActiveDeepSession(userId) || hasActiveSpreadSession(userId)) {
    return false;
  }
  getOrCreateUser(userId);
  if (!shouldShowWhatsNew(getLastSeenReleaseSync(userId))) {
    return false;
  }
  await reply(whatsNewHtml(), {
    ...keyboardWhatsNewDismiss(),
    ...TELEGRAM_HTML_PARSE,
  });
  return true;
}

/** Отправить «Что нового», если пользователь ещё не видел текущий релиз. */
export async function deliverWhatsNewIfNeeded(ctx: Context, userId: number): Promise<boolean> {
  return deliverWhatsNewCore(userId, (text, extra) => ctx.reply(text, extra));
}

/** То же для запуска из Mini App по HTTP (без Telegraf Context). */
export async function deliverWhatsNewIfNeededViaTelegram(
  telegram: Telegraf['telegram'],
  userId: number,
): Promise<boolean> {
  return deliverWhatsNewCore(userId, (text, extra) => telegram.sendMessage(userId, text, extra));
}

export function markWhatsNewSeen(userId: number): void {
  markReleaseSeenSync(userId, APP_RELEASE_VERSION);
}
