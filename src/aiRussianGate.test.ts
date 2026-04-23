import { describe, expect, it } from 'vitest';
import { textLooksNonRussianDominant } from './aiRussianGate.js';

describe('textLooksNonRussianDominant', () => {
  it('русский текст с умеренной латиницей — не триггер', () => {
    const ru = `
<b>Контекст</b>
Короткое толкование на русском языке без длинных английских абзацев.
Ещё пара предложений про карту дня и настроение.
`.repeat(4);
    expect(textLooksNonRussianDominant(ru)).toBe(false);
  });

  it('преимущественно английский абзац — триггер', () => {
    const en = `
The card suggests a moment of reflection. You may feel uncertain about the path ahead.
Consider your inner voice and take small steps forward. The energy is calm but focused.
This is a general reading and not a prediction of specific events.`.repeat(3);
    expect(textLooksNonRussianDominant(en)).toBe(true);
  });

  it('слишком короткий текст — не триггер', () => {
    expect(textLooksNonRussianDominant('OK')).toBe(false);
    expect(textLooksNonRussianDominant('The Star')).toBe(false);
  });
});
