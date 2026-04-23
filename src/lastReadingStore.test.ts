import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from './db/database.js';
import { getLastReading, saveLastReading } from './lastReadingStore.js';

describe('lastReadingStore (SQLite)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-last-'));
    closeDatabase();
    initDatabase(join(dir, 't.db'));
  });

  afterEach(async () => {
    closeDatabase();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when empty', () => {
    expect(getLastReading(42)).toBeNull();
  });

  it('returns saved text and overwrites on new save', () => {
    saveLastReading(1, 'Первый разбор.');
    expect(getLastReading(1)).toBe('Первый разбор.');
    saveLastReading(1, 'Второй.');
    expect(getLastReading(1)).toBe('Второй.');
  });
});
