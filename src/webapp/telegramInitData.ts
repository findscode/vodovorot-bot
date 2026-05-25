import { createHmac } from 'node:crypto';

/** Проверка подписи Telegram WebApp initData; user id или null. */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86_400,
): number | null {
  const trimmed = initData.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams(trimmed);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calculated !== hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return null;
  if (Date.now() / 1000 - authDate > maxAgeSec) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as { id?: unknown };
    return typeof user.id === 'number' && Number.isSafeInteger(user.id) ? user.id : null;
  } catch {
    return null;
  }
}

export function extractInitDataFromAuthHeader(header: string | undefined): string | null {
  if (!header) return null;
  const m = header.match(/^tma\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
