/**
 * Человекочитаемые формулировки про календарные сутки и время рассылки
 * (без сырого IANA в чате — только для известных поясов и нейтральный fallback).
 */

import { getDayDrawTimezone } from './dayDrawState.js';

type PhrasePack = {
  /** Вставка вроде «не чаще раза в сутки …» */
  dayLimitCalendar: string;
  /** После «полуночи …» */
  midnight: string;
  /** После «около 9:00 …» (творительный / пояснение часов) */
  pushClockInstrumental: string;
};

const KNOWN: Record<string, PhrasePack> = {
  'Europe/Moscow': {
    dayLimitCalendar: 'по московской календарной дате',
    midnight: 'по Москве',
    pushClockInstrumental: 'московскому времени',
  },
  'Europe/Kaliningrad': {
    dayLimitCalendar: 'по калининградской календарной дате',
    midnight: 'по Калининграду',
    pushClockInstrumental: 'калининградскому времени',
  },
  'Europe/Samara': {
    dayLimitCalendar: 'по самарской календарной дате',
    midnight: 'по Самаре',
    pushClockInstrumental: 'самарскому времени',
  },
  'Asia/Yekaterinburg': {
    dayLimitCalendar: 'по екатеринбургской календарной дате',
    midnight: 'по Екатеринбургу',
    pushClockInstrumental: 'екатеринбургскому времени',
  },
};

const FALLBACK: PhrasePack = {
  dayLimitCalendar: 'по календарной дате для суток карты дня',
  midnight: 'когда для карты дня начнутся новые сутки',
  pushClockInstrumental: 'времени, сохранённому для рассылки',
};

export function phrasesForIanaTimezone(tz: string): PhrasePack {
  return KNOWN[tz] ?? FALLBACK;
}

/** Пояс для лимита «на день» в текущей конфигурации сервера. */
export function dayDrawPhrasesForServer(): PhrasePack {
  return phrasesForIanaTimezone(getDayDrawTimezone());
}

/** «9:00» вместо «09:00» для читаемости. */
export function formatHhmmForUser(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm.trim();
  const h = String(Number(m[1]));
  const min = m[2];
  return `${h}:${min}`;
}
