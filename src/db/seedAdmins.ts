import { parseAllowlistFromEnvString } from '../accessWhitelist.js';
import { setUserAdminSync } from './usersRepo.js';

/** Опционально: `ADMIN_TELEGRAM_USER_IDS` — те же правила списка, что у whitelist. */
export function seedAdminsFromEnv(): void {
  const raw = process.env.ADMIN_TELEGRAM_USER_IDS?.trim();
  if (!raw) return;
  try {
    const ids = parseAllowlistFromEnvString(raw);
    for (const id of ids) {
      setUserAdminSync(id, true);
    }
    console.log(`[db] Админы из ADMIN_TELEGRAM_USER_IDS: ${ids.size} id`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
