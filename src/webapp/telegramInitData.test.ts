import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { validateTelegramInitData } from './telegramInitData.js';

function buildInitData(botToken: string, userId: number, authDate: number): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test' });
  const params = new URLSearchParams({
    auth_date: String(authDate),
    user,
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('validateTelegramInitData', () => {
  const token = '123456:ABC-DEF';

  it('accepts valid initData', () => {
    const authDate = Math.floor(Date.now() / 1000);
    const initData = buildInitData(token, 42, authDate);
    expect(validateTelegramInitData(initData, token)).toBe(42);
  });

  it('rejects tampered hash', () => {
    const initData = buildInitData(token, 42, Math.floor(Date.now() / 1000));
    expect(validateTelegramInitData(`${initData}&x=1`, token)).toBeNull();
  });

  it('rejects expired auth_date', () => {
    const initData = buildInitData(token, 42, 1);
    expect(validateTelegramInitData(initData, token, 60)).toBeNull();
  });
});
