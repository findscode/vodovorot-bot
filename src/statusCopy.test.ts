import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { extendPremiumByDaysSync, setDayPushEnabled } from './db/usersRepo.js';
import { helpTextHtml } from './statusCopy.js';

describe('statusCopy / help', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-status-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('basic user sees sprout on base features, star on premium hints', () => {
    const html = helpTextHtml(1);
    expect(html).toContain('Справка');
    expect(html).not.toMatch(/новичок|basic/i);
    expect(html).toContain('🌱');
    expect(html).toContain('Premium');
    expect(html).toContain('осталось');
    expect(html).not.toContain('/promo');
    expect(html).toContain('трёх');
    expect(html).toContain('коротким');
    expect(html).toContain('Рассылка');
    expect(html).toContain('врача');
  });

  it('premium user sees star Premium active', () => {
    extendPremiumByDaysSync(3, 7);
    const html = helpTextHtml(3);
    expect(html).toContain('⭐️');
    expect(html).toContain('Premium');
    expect(html).not.toMatch(/новичок/i);
  });

  it('при включённой подписке показывает время', () => {
    vi.stubEnv('DAY_PUSH_ENABLED', '1');
    setDayPushEnabled(2, true, 'Europe/Moscow', '09:00');
    const html = helpTextHtml(2);
    expect(html).toContain('9:00');
    expect(html).toContain('Рассылка');
  });

  it('при глобальной паузе не говорит, что рассылка включена', () => {
    vi.stubEnv('DAY_PUSH_ENABLED', '1');
    setDayPushEnabled(4, true, 'Europe/Moscow', '09:00');
    vi.stubEnv('DAY_PUSH_ENABLED', '0');
    const html = helpTextHtml(4);
    expect(html).toContain('временно недоступна');
    expect(html).not.toContain('Рассылка</b>: включена');
  });
});
