import {
  brandFormatDeepBasicFinalPromptBlock,
  brandFormatDeepFinalPromptBlock,
} from '../brandFormat.js';
import type { DrawnCard, TarotCard } from '../deck.js';
import { formatDrawnLine } from '../deck.js';
import { ORIENTATION_HINT } from '../readingPromptRules.js';
import { promptVoiceArchetypeBlock } from '../readingVoice.js';
import { SAFETY_HINT } from '../safetyHint.js';

const TRIPLET_FORMAT = `ФОРМАТ ОТВЕТА:
1–2 абзаца, в каждом 2–4 предложения — плотно и по делу, без «воды».
Слева направо: на каждую карту — один яркий образ с картинки (жест, фигура, ключевой символ) и одна мягкая подсказка к вопросу; не перечисляй всё подряд. Символы и номиналы — только если сразу проясняют смысл, короткой фразой.
Завершение: одна-две фразы, как три образа вместе отвечают на вопрос.
Без имён позиций «прошлое/настоящее», без заголовков, #, списков и без меток вроде «О чём здесь речь».
Тон: конкретно, но бережно; без приговоров, давления и опасных императивов.
В самом конце ответа (после пустой строки) добавь служебную строку, начинающуюся ровно с: РЕЗЮМЕ:
После «РЕЗЮМЕ:» — 2–3 коротких предложения для внутреннего контекста следующих шагов (пользователь эту часть не увидит).`;

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

${TRIPLET_FORMAT}`;
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
