import { brandFormatDeepFinalPromptBlock } from '../brandFormat.js';
import type { DrawnCard, TarotCard } from '../deck.js';
import { formatDrawnLine } from '../deck.js';
import { promptVoiceArchetypeBlock } from '../readingVoice.js';

const ORIENTATION_HINT = `Внутренне для смысла: прямое положение — более «открытое» прочтение символа; перевёрнутая карта — задержки, внутренний слой, уход от темы или тень того же архетипа. В тексте для пользователя не упоминай положение карты, если она не перевёрнутая. Если карта перевёрнутая — учитывай это в смысле и при необходимости говори об этом естественно, без драматизации.`;

const LANGUAGE_HINT =
  'Только русский язык, без английских и иных иноязычных слов, без латиницы в рядовом тексте. Грамотная связная речь. Пиши так, будто объясняешь другу за чашкой чая.';

const TRIPLET_FORMAT = `ФОРМАТ ОТВЕТА:
Дай ровно около двух абзацев связного толкования по трём картам слева направо (без имён позиций «прошлое/настоящее»). Ответь на вопрос или утверждение пользователя дословно переданное ниже.
Без заголовков, #, списков и без меток вроде «Прошлое», «О чём здесь речь».
В самом конце ответа (после пустой строки) добавь служебную строку, начинающуюся ровно с: РЕЗЮМЕ:
После «РЕЗЮМЕ:» — 3–4 предложения для внутреннего контекста следующих шагов (пользователь эту часть не увидит).
Запрещено: обещания событий; медицина, юриспруденция, финансовые советы.`;

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

${ORIENTATION_HINT}

${LANGUAGE_HINT}

${TRIPLET_FORMAT}`;
}

export function deepFinalPrompt(questions: string[], summaries: string[]): string {
  const steps = questions
    .map((q, i) => `Шаг ${i + 1}. Вопрос: «${q.replace(/"/g, "'")}»\nРезюме: ${summaries[i] ?? ''}`)
    .join('\n\n');
  return `Глубинная диагностика — общий финальный вывод по всей сессии (новых карт нет).

${steps}

${LANGUAGE_HINT}

${brandFormatDeepFinalPromptBlock()}`;
}
