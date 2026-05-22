import { randomInt } from 'node:crypto';
import { PROMO_SECRET_ALPHABET, PROMO_SECRET_LENGTH } from './promoConfig.js';

/** Случайный промокод в духе Таро + криптостойкий суффикс. */

const MAJOR_ARCANA = [
  'FOOL',
  'MAGE',
  'PRIESTESS',
  'EMPRESS',
  'EMPEROR',
  'LOVERS',
  'CHARIOT',
  'STRENGTH',
  'HERMIT',
  'WHEEL',
  'JUSTICE',
  'HANGED',
  'DEATH',
  'TEMPERANCE',
  'DEVIL',
  'TOWER',
  'STAR',
  'MOON',
  'SUN',
  'JUDGEMENT',
  'WORLD',
] as const;

const SUITS = ['WANDS', 'CUPS', 'SWORDS', 'COINS'] as const;

const RANKS = [
  'ACE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
] as const;

const COURTS = ['PAGE', 'KNIGHT', 'QUEEN', 'KING'] as const;

const SYMBOLS = [
  'OMEN',
  'ORB',
  'FLAME',
  'TIDE',
  'MIST',
  'ROOT',
  'KEY',
  'MIRROR',
  'CROWN',
  'SCALES',
  'LANTERN',
  'WINGS',
  'ROSE',
  'SERPENT',
  'COMET',
] as const;

type Pattern = () => string;

const PATTERNS: Pattern[] = [
  () => `${pick(MAJOR_ARCANA)}-${pick(SYMBOLS)}`,
  () => `${pick(SYMBOLS)}-${pick(MAJOR_ARCANA)}`,
  () => `${pick(SUITS)}-${pick(RANKS)}`,
  () => `${pick(SUITS)}-${pick(COURTS)}`,
  () => `${pick(MAJOR_ARCANA)}-${pick(SUITS)}`,
  () => `${pick(MAJOR_ARCANA)}-${pick(RANKS)}`,
  () => `${pick(MAJOR_ARCANA)}-${pick(SUITS)}-${pick(RANKS)}`,
];

function pick<T extends readonly string[]>(arr: T): T[number] {
  const idx = randomInt(0, arr.length);
  return arr[idx]!;
}

/** Суффикс из {@link PROMO_SECRET_LENGTH} символов (crypto.randomInt). */
export function randomPromoSecret(length = PROMO_SECRET_LENGTH): string {
  const n = PROMO_SECRET_ALPHABET.length;
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PROMO_SECRET_ALPHABET[randomInt(0, n)]!;
  }
  return out;
}

function generateTarotPrefix(): string {
  const pattern = PATTERNS[randomInt(0, PATTERNS.length)]!;
  return pattern();
}

/**
 * Код вида `STAR-LANTERN-K7NP4X` — читаемый таро-префикс + секрет, не угадываемый перебором словаря.
 */
export function generateTarotPromoCode(): string {
  return `${generateTarotPrefix()}-${randomPromoSecret()}`;
}
