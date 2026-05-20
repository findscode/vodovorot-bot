/**
 * Нейтральные формулировки про календарные сутки и время рассылки (без городов и IANA в чате).
 */

/** Вставка вроде «не чаще раза в сутки …» */
export const DAY_LIMIT_ONCE_PER_CALENDAR_DAY = 'за календарные сутки';

export type CalendarDayPhrases = {
  /** Фрагмент для «не чаще раза в сутки …» */
  dayLimitCalendar: string;
  /** Для лимита «новая карта — …» */
  midnight: string;
  /** Для подписи времени рассылки в /status (без IANA) */
  pushClockInstrumental: string;
};

/** «9:00» вместо «09:00» для читаемости. */
export function formatHhmmForUser(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm.trim();
  const h = String(Number(m[1]));
  const min = m[2];
  return `${h}:${min}`;
}

function neutralPhrases(): CalendarDayPhrases {
  return {
    dayLimitCalendar: DAY_LIMIT_ONCE_PER_CALENDAR_DAY,
    midnight: 'после полуночи',
    pushClockInstrumental: 'в выбранное время',
  };
}

/** Фразы для лимита «карта дня» (текст в чате не привязан к `DAY_DRAW_TIMEZONE`). */
export function dayDrawPhrasesForServer(): CalendarDayPhrases {
  return neutralPhrases();
}

/** Фразы для рассылки; часовой пояс хранится для расчётов, в чате не показываем. */
export function phrasesForIanaTimezone(_iana: string): CalendarDayPhrases {
  return neutralPhrases();
}
