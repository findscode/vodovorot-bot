const CYRILLIC_LETTER_RE = /[\u0400-\u04FF]/g;
const LATIN_LETTER_RE = /[A-Za-z]/g;

/**
 * Эвристика: в толковании слишком много латинских букв в «словесной» части —
 * вероятен уход модели в английский (абзацы, фразы), а не единичные термины.
 */
export function textLooksNonRussianDominant(text: string): boolean {
  const stripped = text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/<[^>]{0,200}?>/g, ' ');
  const c = (stripped.match(CYRILLIC_LETTER_RE) ?? []).length;
  const l = (stripped.match(LATIN_LETTER_RE) ?? []).length;
  const total = c + l;
  if (total < 48) return false;
  const ratioLatin = l / total;
  if (l >= 28 && ratioLatin >= 0.2) return true;
  if (l >= 55 && c < l) return true;
  return false;
}
