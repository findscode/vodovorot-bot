/**
 * Формат ответов толкования по бренд-гайду Водоворот → встраивается в промпты.
 * В Telegram: HTML, строки-метки без тире в конце (см. READING_SECTION_LABELS).
 */

/** Заголовки блоков толкования (ровно такая строка целиком, без тире в конце). */
export const READING_SECTION_LABELS: readonly string[] = [
  'О чём здесь речь',
  'Коротко о дне',
  'Прошлое',
  'Настоящее',
  'Будущее',
  'Как это сходится',
  'Общая картина',
  'На что обратить внимание',
  'Итог',
];

const SECTION_LABEL_SET = new Set(READING_SECTION_LABELS);

export function isReadingSectionLabelLine(line: string): boolean {
  return SECTION_LABEL_SET.has(line.trim());
}

const EMPTY_LINE_ARTIFACT_RE = /^\s*Пустая строка\.?\s*$/i;

/** Эхо инструкции формата: «Отдельная строка-метка ровно: …». */
const META_LABEL_PREFIX_RE =
  /^\s*(?:[•\-*]\s*)?(?:(?:отдельная\s+)?(?:строка[-\s]*)?метк[аи]?(?:\s+раздела)?\s*(?:ровно\s*)?[:：]\s*)(.+)$/iu;

function labelsMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().replace(/ё/g, 'е').toLowerCase();
  return norm(a) === norm(b);
}

function resolveSectionLabel(candidate: string): string | null {
  const c = candidate.trim();
  for (const label of READING_SECTION_LABELS) {
    if (labelsMatch(c, label)) return label;
  }
  return null;
}

/** Одна строка ответа модели: метка без служебного префикса, артефакты убраны. */
export function canonicalizeReadingModelLine(line: string): string {
  const trimmed = line.trim();
  if (EMPTY_LINE_ARTIFACT_RE.test(trimmed)) return '';

  if (isReadingSectionLabelLine(trimmed)) return trimmed;

  const meta = trimmed.match(META_LABEL_PREFIX_RE);
  if (meta?.[1]) {
    return resolveSectionLabel(meta[1]) ?? meta[1].trim();
  }

  if (/метк/i.test(trimmed) && /(?:ровно|[:：])/i.test(trimmed)) {
    for (const label of READING_SECTION_LABELS) {
      if (trimmed.includes(label)) return label;
      const alt = label.replace(/ё/g, 'е');
      if (alt !== label && trimmed.includes(alt)) return label;
    }
  }

  return line;
}

/** Плоский текст толкования перед HTML: убрать артефакты и эхо инструкций формата. */
export function sanitizeReadingModelText(plain: string): string {
  const out: string[] = [];
  for (const line of plain.split('\n')) {
    const wasBlank = line.trim() === '';
    const canon = canonicalizeReadingModelLine(line);
    if (canon === '') {
      if (wasBlank) out.push('');
      continue;
    }
    out.push(canon);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

const FORMAT_RULES_COMMON = `Метки пиши ровно как в каркасе, отдельными строками; между блоками оставляй пустую строку.
Не повторяй инструкции, не добавляй другие заголовки, списки, #, звёздочки и символы < > &.`;

/**
 * Расклад «на день»: карта уже в подписи к фото (заголовок + строка карты от бота).
 * Ответ модели — только блоки меток, без дублирования строки карты перед «О чём здесь речь».
 */
export function brandFormatDayPromptBlock(): string {
  return `ФОРМАТ ОТВЕТА — выведи ровно этот каркас.
Карта и толкователь уже указаны в подписи. Не пиши ничего до первой метки и не повторяй данные подписи отдельной шапкой.

О чём здесь речь
(1–2 абзаца: смысл карты на сегодня)

Коротко о дне
(один абзац: короткий вывод дня)

(один короткий финальный абзац без заголовка: нейтрально — повод поразмыслить, не приговор)

${FORMAT_RULES_COMMON}`;
}

/**
 * Расклад «прошлое — настоящее — будущее»: позиции и карты уже в подписи к коллажу.
 */
export function brandFormatSpreadPromptBlock(): string {
  return `ФОРМАТ ОТВЕТА — выведи ровно этот каркас.
Позиции, карты, тема и толкователь уже указаны в подписи. Не пиши ничего до первой метки и не повторяй данные подписи отдельной шапкой.

Прошлое
(один абзац; ориентацию — только если карта перевёрнутая)

Настоящее
(один абзац)

Будущее
(один абзац)

Как это сходится
(1–2 абзаца: связь трёх карт)

(один короткий финальный абзац без заголовка: размышление над картами не равно приговору)

${FORMAT_RULES_COMMON}`;
}

/** Короткий финал deep на basic: 2–3 абзаца без многосекционной разметки. */
export function brandFormatDeepBasicFinalPromptBlock(): string {
  return `ФОРМАТ ОТВЕТА (соблюдай буквально):
Это короткий общий вывод по глубинной диагностике (до трёх шагов). Новых карт нет.

• 2–3 абзаца подряд, в каждом 2–4 предложения: связная картина всех шагов, что важно не упустить, мягкий итог без приговора.
• Без строк-меток, без #, без списков, без служебных фраз про разметку.
• Не используй < > & и звёздочки — только текст толкования.
• После последнего абзаца — одна короткая фраза: размышление над картами не равно приговору — спокойно, один раз.`;
}

/** Финал глубинной диагностики: без новых карт, по всей цепочке вопросов. */
export function brandFormatDeepFinalPromptBlock(): string {
  return `ФОРМАТ ОТВЕТА (соблюдай буквально):
Общий вывод по глубинной диагностике. Новых карт нет.

Выведи ответ по этому каркасу:

Общая картина
(2–3 абзаца)

На что обратить внимание
(1–2 абзаца)

Итог
(1–2 абзаца)

(один короткий финальный абзац без заголовка)

${FORMAT_RULES_COMMON}
Запрещена метка «Как развивалась линия вопросов».`;
}
