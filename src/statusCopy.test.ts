import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { setAccessWhitelist } from './runtimeConfig.js';
import { setDayPushEnabled } from './db/usersRepo.js';
import { statusTextHtml } from './statusCopy.js';

describe('statusCopy', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-status-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
    setAccessWhitelist(null);
  });

  afterEach(async () => {
    closeDatabase();
    setAccessWhitelist(null);
    await rm(dir, { recursive: true, force: true });
  });

  it('в открытом режиме упоминает оба расклада', () => {
    const html = statusTextHtml(1);
    expect(html).toContain('открытый');
    expect(html).toContain('Рассылка');
  });

  it('при включённой подписке показывает время', () => {
    setDayPushEnabled(2, true, 'Europe/Moscow', '09:00');
    const html = statusTextHtml(2);
    expect(html).toContain('9:00');
    expect(html).toContain('Рассылка');
  });
});
