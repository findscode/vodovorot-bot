import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dayDrawPhrasesForServer,
  formatHhmmForUser,
  phrasesForIanaTimezone,
} from './calendarDayUserPhrases.js';

describe('calendarDayUserPhrases', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Europe/Moscow: знакомые формулировки', () => {
    vi.stubEnv('DAY_DRAW_TIMEZONE', 'Europe/Moscow');
    const p = dayDrawPhrasesForServer();
    expect(p.midnight).toContain('Москв');
    expect(p.dayLimitCalendar).toContain('москов');
  });

  it('неизвестный IANA: нейтральный fallback без сырого имени в фразах', () => {
    vi.stubEnv('DAY_DRAW_TIMEZONE', 'America/Toronto');
    const p = dayDrawPhrasesForServer();
    expect(p.dayLimitCalendar).toContain('карты дня');
    expect(p.midnight).not.toContain('Toronto');
  });

  it('phrasesForIanaTimezone для рассылки совпадает с Москвой', () => {
    const p = phrasesForIanaTimezone('Europe/Moscow');
    expect(p.pushClockInstrumental).toContain('москов');
  });

  it('formatHhmmForUser убирает ведущий ноль у часа', () => {
    expect(formatHhmmForUser('09:05')).toBe('9:05');
    expect(formatHhmmForUser('9:05')).toBe('9:05');
  });
});
