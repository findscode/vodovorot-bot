import type { Telegraf } from 'telegraf';
import { registerPrivateChatMiddleware, registerDeepSessionMiddleware } from './middleware.js';
import { registerDeepReadingHandlers } from './registerDeepReadingHandlers.js';
import { registerCommands } from './registerCommands.js';
import { registerDayHandlers } from './registerDayHandlers.js';
import { registerDayPushHandlers } from './registerDayPushHandlers.js';
import { registerSpreadHandlers } from './registerSpreadHandlers.js';
import { registerErrorHandler } from './registerErrorHandler.js';
import { registerAdminHandlers } from './registerAdminHandlers.js';

export function registerHandlers(bot: Telegraf): void {
  registerPrivateChatMiddleware(bot);
  registerDeepSessionMiddleware(bot);
  registerAdminHandlers(bot);
  registerDeepReadingHandlers(bot);
  registerCommands(bot);
  registerDayPushHandlers(bot);
  registerDayHandlers(bot);
  registerSpreadHandlers(bot);
  registerErrorHandler(bot);
}
