import { describe, expect, it } from 'vitest';
import { parseTelegramUserIdsFromEnv } from './telegramUserIdList.js';

describe('parseTelegramUserIdsFromEnv', () => {
  it('parses comma- and space-separated ids', () => {
    expect(parseTelegramUserIdsFromEnv('1, 2;3')).toEqual(new Set([1, 2, 3]));
  });

  it('rejects non-numeric fragments', () => {
    expect(() => parseTelegramUserIdsFromEnv('abc')).toThrow(/Недопустимый фрагмент/);
  });

  it('rejects empty input', () => {
    expect(() => parseTelegramUserIdsFromEnv('  ')).toThrow(/ни одного/);
  });
});
