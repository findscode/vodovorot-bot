import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { extendPremiumByDaysSync, setDayPushEnabled } from './db/usersRepo.js';
import { statusTextHtml } from './statusCopy.js';

describe('statusCopy', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-status-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('basic user sees sprout on base features, star on premium hints', () => {
    const html = statusTextHtml(1);
    expect(html).not.toMatch(/новичок|basic/i);
    expect(html).toContain('🌱');
    expect(html).toContain('⭐️');
    expect(html).toContain('/promo');
    expect(html).toContain('трёх');
    expect(html).toContain('Рассылка');
  });

  it('premium user sees star Premium active', () => {
    extendPremiumByDaysSync(3, 7);
    const html = statusTextHtml(3);
    expect(html).toContain('⭐️');
    expect(html).toContain('Premium');
    expect(html).not.toMatch(/новичок/i);
  });

  it('при включённой подписке показывает время', () => {
    setDayPushEnabled(2, true, 'Europe/Moscow', '09:00');
    const html = statusTextHtml(2);
    expect(html).toContain('9:00');
    expect(html).toContain('Рассылка');
  });
});
