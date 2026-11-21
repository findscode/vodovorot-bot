import {
  brandFormatDeepBasicFinalPromptBlock,
  brandFormatDeepFinalPromptBlock,
  brandFormatDeepTripletPromptBlock,
} from '../brandFormat.js';
import type { DrawnCard, TarotCard } from '../deck.js';
import { formatDrawnLine } from '../deck.js';
import { ORIENTATION_HINT } from '../readingPromptRules.js';
import { promptVoiceArchetypeBlock } from '../readingVoice.js';
import { SAFETY_HINT } from '../safetyHint.js';

export function deepTripletPrompt(
  question: string,
  cards: [DrawnCard, DrawnCard, DrawnCard],
  priorSummaries: string[],
  voice: TarotCard,
): string {
  const cardLines = cards.map((d, i) => `${i + 1}: ${formatDrawnLine(d)}`).join('\n');
  const history =
    priorSummaries.length > 0
      ? `\nКраткие резюме прошлых шагов (служебно):\n${priorSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
      : '';
  return `Глубинная диагностика, шаг триплета. Вопрос или утверждение пользователя (дословно):
«${question.replace(/"/g, "'")}»

Три карты слева направо:
${cardLines}
${history}
${promptVoiceArchetypeBlock(voice)}

Правило ориентации: ${ORIENTATION_HINT}

${SAFETY_HINT}

${brandFormatDeepTripletPromptBlock()}`;
}

function deepFinalStepsBlock(questions: string[], summaries: string[]): string {
  return questions
    .map((q, i) => `Шаг ${i + 1}. Вопрос: «${q.replace(/"/g, "'")}»\nРезюме: ${summaries[i] ?? ''}`)
    .join('\n\n');
}

export function deepFinalPrompt(questions: string[], summaries: string[]): string {
  return `Глубинная диагностика — общий финальный вывод по всей сессии (новых карт нет).

${deepFinalStepsBlock(questions, summaries)}

${SAFETY_HINT}

${brandFormatDeepFinalPromptBlock()}`;
}

/** Укороченный финал для basic (#60). */
export function deepBasicFinalPrompt(questions: string[], summaries: string[]): string {
  return `Глубинная диагностика — короткий общий вывод по сессии (до трёх шагов, новых карт нет).

${deepFinalStepsBlock(questions, summaries)}

${SAFETY_HINT}

${brandFormatDeepBasicFinalPromptBlock()}`;
}
