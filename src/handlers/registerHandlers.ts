import type { Telegraf } from 'telegraf';
import { registerPrivateChatMiddleware, registerDeepSessionMiddleware } from './middleware.js';
import { registerSpreadSessionMiddleware } from './spreadSessionMiddleware.js';
import {
  registerReleaseNotesHandlers,
  registerWhatsNewTriggerMiddleware,
} from './registerReleaseNotesHandlers.js';
import { registerDeepReadingHandlers } from './registerDeepReadingHandlers.js';
import { registerCommands } from './registerCommands.js';
import { registerDayHandlers } from './registerDayHandlers.js';
import { registerDayPushHandlers } from './registerDayPushHandlers.js';
import { registerSpreadHandlers } from './registerSpreadHandlers.js';
import { registerQuestionClarityHandlers } from './registerQuestionClarityHandlers.js';
import { registerErrorHandler } from './registerErrorHandler.js';
import { registerAdminHandlers } from './registerAdminHandlers.js';
import { registerPromoHandlers } from './registerPromoHandlers.js';

export function registerHandlers(bot: Telegraf): void {
  registerPrivateChatMiddleware(bot);
  registerWhatsNewTriggerMiddleware(bot);
  registerDeepSessionMiddleware(bot);
  registerSpreadSessionMiddleware(bot);
  registerReleaseNotesHandlers(bot);
  registerAdminHandlers(bot);
  registerPromoHandlers(bot);
  registerDeepReadingHandlers(bot);
  registerQuestionClarityHandlers(bot);
  registerCommands(bot);
  registerDayPushHandlers(bot);
  registerDayHandlers(bot);
  registerSpreadHandlers(bot);
  registerErrorHandler(bot);
}
