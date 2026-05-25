import { brandFormatDayPromptBlock, brandFormatSpreadPromptBlock } from './brandFormat.js';
import { type DrawnCard, type TarotCard } from './deck.js';
import { promptVoiceArchetypeBlock } from './readingVoice.js';
import { SAFETY_HINT } from './safetyHint.js';

const ORIENTATION_HINT = `Внутренне для смысла: прямое положение — более «открытое» прочтение символа; перевёрнутая карта — задержки, внутренний слой, уход от темы или тень того же архетипа. Перевёрнутость — часть расклада, не «плохая карта». В тексте для пользователя не упоминай положение карты, если она не перевёрнутая (никаких «прямая», «в прямом положении» и т.п.). Если карта перевёрнутая — учитывай это в смысле и при необходимости говори об этом естественно, без драматизации.`;

const LANGUAGE_HINT =
  'Только русский язык, без английских и иных иноязычных слов, без латиницы в рядовом тексте и без модных калек (никаких mindset, focus и т.п.). Грамотная связная речь, без «переводного» порядка слов. Пиши так, будто объясняешь другу за чашкой чая — ясно, без понтов.';

export function cardOfDayPrompt(drawn: DrawnCard, voice: TarotCard): string {
  const cardContext = drawn.reversed
    ? `Карта: «${drawn.card.name}», положение: перевёрнутая.`
    : `Карта: «${drawn.card.name}» (обычное положение; в ответе пользователю о положении не пиши).`;
  return `Нужен разбор на день по одной карте.
${cardContext}

${promptVoiceArchetypeBlock(voice)}

${ORIENTATION_HINT}

${LANGUAGE_HINT}

${brandFormatDayPromptBlock()}

${SAFETY_HINT}

Без обещаний конкретных событий. Маска-рассказчика слышна внутри абзацев под метками «О чём здесь речь» и «Коротко о дне», не в строке 1. Не говори свысока ни к начинающим, ни к тем, кто давно с Таро — одинаково уважительно и по делу.`;
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

${ORIENTATION_HINT}

${LANGUAGE_HINT}

${brandFormatSpreadPromptBlock()}

${SAFETY_HINT}

Содержание: отталкивайся от вопроса пользователя; по каждой позиции — смысл карты простыми словами (положение карты в тексте указывай только если она перевёрнутая); в «Как это сходится» — понятная связка всех трёх с темой вопроса.
Без обещаний событий. Маска-рассказчика — только внутри абзацев, не отдельной шапкой. Тон ровный: и новичку понятно, и опытному читателю не скучно — без поучений и без занудной энциклопедичности.`;
}
