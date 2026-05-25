import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { initDatabase } from './db/database.js';
import { migrateLegacyDayDrawJsonIfNeeded } from './db/migrateLegacyDayDraw.js';
import { seedAdminsFromEnv } from './db/seedAdmins.js';
import { getDayDrawTimezone, getDayDrawStatePath } from './dayDrawState.js';
import { getDatabasePath } from './db/database.js';
import { registerHandlers } from './handlers/registerHandlers.js';
import { startDayPushScheduler } from './dayPushScheduler.js';
import { startWebappServer } from './webapp/webappServer.js';
import { webappSettingsUrl } from './webapp/webappConfig.js';

initDatabase();
migrateLegacyDayDrawJsonIfNeeded();
seedAdminsFromEnv();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('В .env нет BOT_TOKEN');
  process.exit(1);
}

const bot = new Telegraf(token);
registerHandlers(bot);

const tzLabel = getDayDrawTimezone();
const dbPath = getDatabasePath();
console.log(
  `Водоворот: публичный режим; spread — Premium. «На день» 1×/сутки (${tzLabel}). БД: ${dbPath}; legacy JSON (если был): ${getDayDrawStatePath()}`,
);

startDayPushScheduler(bot);
startWebappServer(bot, token);

bot.launch().then(async () => {
  console.log('Бот запущен (Ctrl+C для остановки)');
  const webappUrl = webappSettingsUrl();
  if (webappUrl) {
    try {
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: 'Меню',
          web_app: { url: webappUrl },
        },
      });
      console.log(`Mini App menu: ${webappUrl}`);
    } catch (e) {
      console.warn('[webapp_menu]', e instanceof Error ? e.message : e);
    }
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
