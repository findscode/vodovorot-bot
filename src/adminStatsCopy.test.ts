import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminStatsHtml } from './adminStatsCopy.js';
import { closeDatabase, initDatabase } from './db/database.js';
import { extendPremiumByDaysSync, getOrCreateUser, setDayPushEnabled } from './db/usersRepo.js';
import { opsAiModelSuccess, opsEvent, resetOpsStatsForTests } from './opsLog.js';

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
    opsEvent('question_clarity_checked');
    opsEvent('question_clarity_skip', { reason: 'parse_error' });
    opsAiModelSuccess('google/gemma-4-31b-it:free');

    const html = adminStatsHtml();
    expect(html).toContain('<b>Статистика</b>');
    expect(html).toContain('<b>👥 Пользователи</b>\nВсего: <b>2</b>');
    expect(html).toContain('Premium: <b>1</b>');
    expect(html).toContain('Подписаны на «На день»: <b>1</b>');
    expect(html).toContain('«Прошлое — настоящее — будущее»: <b>2</b>');
    expect(html).toContain('завершено <b>1</b>');
    expect(html).toContain('<b>🔎 Ясность вопроса</b>\nПроверок: <b>1</b>');
    expect(html).toContain('неверный формат ответа — 1');
    expect(html).toContain('Модели: gemma-4-31b-it — 1');
    expect(html).toContain('</b>\n\n<b>🃏 Расклады за сутки</b>');
  });
});
