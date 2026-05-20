import { describe, expect, it } from 'vitest';
import {
  dayDrawPhrasesForServer,
  formatHhmmForUser,
  phrasesForIanaTimezone,
} from './calendarDayUserPhrases.js';

describe('calendarDayUserPhrases', () => {
  it('нейтральные формулировки без городов и IANA', () => {
    const p = dayDrawPhrasesForServer();
    expect(p.dayLimitCalendar).toBe('за календарные сутки');
    expect(p.midnight).toBe('после полуночи');
    expect(p.midnight).not.toMatch(/Москв/i);
    expect(p.dayLimitCalendar).not.toMatch(/москов/i);
  });

  it('phrasesForIanaTimezone не раскрывает имя пояса', () => {
    const p = phrasesForIanaTimezone('Europe/Moscow');
    expect(p.pushClockInstrumental).toBe('в выбранное время');
    expect(p.pushClockInstrumental).not.toContain('Europe');
    expect(p.pushClockInstrumental).not.toMatch(/москов/i);
  });

  it('formatHhmmForUser убирает ведущий ноль у часа', () => {
    expect(formatHhmmForUser('09:05')).toBe('9:05');
    expect(formatHhmmForUser('9:05')).toBe('9:05');
  });
});
