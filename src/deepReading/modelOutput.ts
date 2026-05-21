import { DEEP_SUMMARY_MARKER } from './constants.js';
import { stripModelFormatArtifacts } from '../readingTelegramHtml.js';

/** Отделяет видимый текст и служебное резюме для следующих шагов. */
export function splitTripletModelOutput(raw: string): { userText: string; summary: string } {
  const cleaned = stripModelFormatArtifacts(raw);
  const match = cleaned.match(DEEP_SUMMARY_MARKER);
  if (!match || match.index === undefined) {
    return { userText: cleaned.trim(), summary: cleaned.trim().slice(0, 500) };
  }
  const idx = match.index;
  const userText = cleaned.slice(0, idx).trim();
  const summary = cleaned.slice(idx).replace(DEEP_SUMMARY_MARKER, '').trim();
  return {
    userText: userText || cleaned.trim(),
    summary: summary || userText.slice(0, 400),
  };
}
