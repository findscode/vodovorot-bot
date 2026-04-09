import random from 'random';

export interface TarotCard {
  id: number;
  name: string;
}

/** Вытянутая карта с ориентацией (прямая / перевёрнутая). */
export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
}

function randomOrientation(): boolean {
  return random.boolean();
}

/** Текст положения для пользователя и промптов. */
export function orientationLabel(reversed: boolean): string {
  return reversed ? 'перевёрнутая' : 'прямая';
}

/** Подпись для пользователя: перевёрнутость указываем только если карта reversed. */
export function formatDrawnLine(drawn: DrawnCard): string {
  return drawn.reversed
    ? `${drawn.card.name} (${orientationLabel(drawn.reversed)})`
    : drawn.card.name;
}

/** 22 старших аркана */
const MAJOR_ARCANA: readonly TarotCard[] = [
  { id: 0, name: 'Шут' },
  { id: 1, name: 'Маг' },
  { id: 2, name: 'Верховная Жрица' },
  { id: 3, name: 'Императрица' },
  { id: 4, name: 'Император' },
  { id: 5, name: 'Иерофант' },
  { id: 6, name: 'Влюблённые' },
  { id: 7, name: 'Колесница' },
  { id: 8, name: 'Сила' },
  { id: 9, name: 'Отшельник' },
  { id: 10, name: 'Колесо Фортуны' },
  { id: 11, name: 'Справедливость' },
  { id: 12, name: 'Повешенный' },
  { id: 13, name: 'Смерть' },
  { id: 14, name: 'Умеренность' },
  { id: 15, name: 'Дьявол' },
  { id: 16, name: 'Башня' },
  { id: 17, name: 'Звезда' },
  { id: 18, name: 'Луна' },
  { id: 19, name: 'Солнце' },
  { id: 20, name: 'Суд' },
  { id: 21, name: 'Мир' },
];

/** Числовые карты + двор (как в колоде Райдера–Уэйта) */
const MINOR_RANKS = [
  'Туз',
  'Двойка',
  'Тройка',
  'Четвёрка',
  'Пятёрка',
  'Шестёрка',
  'Семёрка',
  'Восьмёрка',
  'Девятка',
  'Десятка',
  'Паж',
  'Рыцарь',
  'Королева',
  'Король',
] as const;

/** Масти младших арканов (родительный падеж для названия: «Туз Жезлов») */
const MINOR_SUITS_GENITIVE = ['Жезлов', 'Кубков', 'Мечей', 'Пентаклей'] as const;

function buildMinorArcana(): TarotCard[] {
  const cards: TarotCard[] = [];
  let id = MAJOR_ARCANA.length;
  for (const suit of MINOR_SUITS_GENITIVE) {
    for (const rank of MINOR_RANKS) {
      cards.push({ id, name: `${rank} ${suit}` });
      id += 1;
    }
  }
  return cards;
}

/** Полная колода: 22 старших + 56 младших = 78 карт */
export const DECK: readonly TarotCard[] = [...MAJOR_ARCANA, ...buildMinorArcana()];

function withOrientation(card: TarotCard): DrawnCard {
  return { card, reversed: randomOrientation() };
}

export function drawOne(): DrawnCard {
  const c = random.choice([...DECK]);
  if (c === undefined) {
    throw new Error('Пустая колода');
  }
  return withOrientation(c);
}

export function drawThreeUnique(): [DrawnCard, DrawnCard, DrawnCard] {
  const picked = random.sample([...DECK], 3);
  const [a, b, c] = picked;
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error('В колоде меньше трёх карт');
  }
  return [withOrientation(a), withOrientation(b), withOrientation(c)];
}

/** Случайный старший аркан как маска голоса толкования (не входит в расклад). */
export function drawVoiceArchetype(): TarotCard {
  const c = random.choice([...MAJOR_ARCANA]);
  if (c === undefined) {
    throw new Error('Пустой пул архетипов');
  }
  return c;
}
