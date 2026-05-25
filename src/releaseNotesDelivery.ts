import type { Context } from 'telegraf';
import { keyboardWhatsNewDismiss } from './botKeyboards.js';
import { hasActiveDeepSession } from './deepReading/sessionStore.js';
import { getLastSeenReleaseSync, getOrCreateUser, markReleaseSeenSync } from './db/usersRepo.js';
import { TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { APP_RELEASE_VERSION, shouldShowWhatsNew, whatsNewHtml } from './releaseNotes.js';
import { hasActiveSpreadSession } from './spreadSessionStore.js';

/** Отправить «Что нового», если пользователь ещё не видел текущий релиз. */
export async function deliverWhatsNewIfNeeded(ctx: Context, userId: number): Promise<boolean> {
  if (hasActiveDeepSession(userId) || hasActiveSpreadSession(userId)) {
    return false;
  }
  getOrCreateUser(userId);
  if (!shouldShowWhatsNew(getLastSeenReleaseSync(userId))) {
    return false;
  }
  await ctx.reply(whatsNewHtml(), {
    ...keyboardWhatsNewDismiss(),
    ...TELEGRAM_HTML_PARSE,
  });
  return true;
}

export function markWhatsNewSeen(userId: number): void {
  markReleaseSeenSync(userId, APP_RELEASE_VERSION);
}
