import { parseTelegramUserIdsFromEnv } from '../telegramUserIdList.js';
import { setUserAdminSync } from './usersRepo.js';

/** Опционально: `ADMIN_TELEGRAM_USER_IDS` — при старте выставляется `is_admin` в БД. */
export function seedAdminsFromEnv(): void {
  const raw = process.env.ADMIN_TELEGRAM_USER_IDS?.trim();
  if (!raw) return;
  try {
    const ids = parseTelegramUserIdsFromEnv(raw);
    for (const id of ids) {
      setUserAdminSync(id, true);
    }
    console.log(`[db] Админы из ADMIN_TELEGRAM_USER_IDS: ${ids.size} id`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
