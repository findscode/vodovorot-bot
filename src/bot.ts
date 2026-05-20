import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { initDatabase } from './db/database.js';
import { migrateLegacyDayDrawJsonIfNeeded } from './db/migrateLegacyDayDraw.js';
import { seedAdminsFromEnv } from './db/seedAdmins.js';
import { loadOptionalAccessWhitelist } from './accessWhitelist.js';
import { setAccessWhitelist } from './runtimeConfig.js';
import { getDayDrawTimezone, getDayDrawStatePath } from './dayDrawState.js';
import { getDatabasePath } from './db/database.js';
import { registerHandlers } from './handlers/registerHandlers.js';
import { startDayPushScheduler } from './dayPushScheduler.js';

initDatabase();
migrateLegacyDayDrawJsonIfNeeded();
seedAdminsFromEnv();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('В .env нет BOT_TOKEN');
  process.exit(1);
}

let accessWhitelist: ReturnType<typeof loadOptionalAccessWhitelist>;
try {
  accessWhitelist = loadOptionalAccessWhitelist();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
setAccessWhitelist(accessWhitelist);

const bot = new Telegraf(token);
registerHandlers(bot);

const tzLabel = getDayDrawTimezone();
const dbPath = getDatabasePath();
if (accessWhitelist !== null) {
  console.log(
    `Whitelist: полный доступ у ${accessWhitelist.size} user id; остальные — только «карта день» (лимит 1×/сутки по ${tzLabel}). БД: ${dbPath}; legacy JSON (если был): ${getDayDrawStatePath()}`,
  );
} else {
  console.log(`Лимит «карта дня» (дата в ${tzLabel}), БД: ${dbPath}`);
}

bot.launch().then(() => {
  console.log('Слушаю Telegram.');
  startDayPushScheduler(bot);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
