import { brandFormatDayPromptBlock, brandFormatSpreadPromptBlock } from './brandFormat.js';
import { type DrawnCard, type TarotCard } from './deck.js';
import { ORIENTATION_HINT } from './readingPromptRules.js';
import { promptVoiceArchetypeBlock } from './readingVoice.js';
import { SAFETY_HINT } from './safetyHint.js';

export function cardOfDayPrompt(drawn: DrawnCard, voice: TarotCard): string {
  const cardContext = drawn.reversed
    ? `Карта: «${drawn.card.name}», положение: перевёрнутая.`
    : `Карта: «${drawn.card.name}» (обычное положение; в ответе пользователю о положении не пиши).`;
  return `Задача: толкование на день по одной карте.
${cardContext}

${promptVoiceArchetypeBlock(voice)}

Правило ориентации: ${ORIENTATION_HINT}

${SAFETY_HINT}

${brandFormatDayPromptBlock()}`;
}

const POSITIONS = ['Прошлое', 'Настоящее', 'Будущее'] as const;

export function pastPresentFuturePrompt(
  cards: [DrawnCard, DrawnCard, DrawnCard],
  voice: TarotCard,
  question: string,
): string {
  const lines = cards
    .map((d, i) =>
      d.reversed
        ? `${POSITIONS[i]}: ${d.card.name} — перевёрнутая`
        : `${POSITIONS[i]}: ${d.card.name}`,
    )
    .join('\n');
  const q = question.replace(/"/g, "'");
  return `Нужен разбор по трём позициям: прошлое, настоящее, будущее.

Вопрос или тема пользователя (дословно):
«${q}»

${lines}

${promptVoiceArchetypeBlock(voice)}

Правило ориентации: ${ORIENTATION_HINT}

${SAFETY_HINT}

Содержание: свяжи каждую позицию с вопросом пользователя; в «Как это сходится» собери понятный общий смысл.

${brandFormatSpreadPromptBlock()}`;
}
