import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminStatsHtml } from './adminStatsCopy.js';
import { closeDatabase, initDatabase } from './db/database.js';
import { extendPremiumByDaysSync, getOrCreateUser, setDayPushEnabled } from './db/usersRepo.js';
import { opsEvent, resetOpsStatsForTests } from './opsLog.js';

describe('adminStatsHtml', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-admin-stats-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
    resetOpsStatsForTests();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('includes user counts and ops aggregates', () => {
    extendPremiumByDaysSync(1, 7);
    getOrCreateUser(2);
    setDayPushEnabled(2, true, 'Europe/Moscow', '09:00');
    opsEvent('spread_completed');
    opsEvent('spread_completed');
    opsEvent('deep_final_basic');

    const html = adminStatsHtml();
    expect(html).toContain('<b>Статистика</b>');
    expect(html).toContain('Пользователей в БД: <b>2</b>');
    expect(html).toContain('Активный Premium: <b>1</b>');
    expect(html).toContain('Подписчиков «На день»: <b>1</b>');
    expect(html).toContain('Spread завершён: <b>2</b>');
    expect(html).toContain('Deep финал (basic): <b>1</b>');
  });
});
