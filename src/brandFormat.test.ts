import { describe, expect, it } from 'vitest';
import { canonicalizeReadingModelLine, sanitizeReadingModelText } from './brandFormat.js';

describe('brandFormat model output sanitize', () => {
  it('canonicalizeReadingModelLine strips meta prefix from section label', () => {
    expect(canonicalizeReadingModelLine('Отдельная строка-метка ровно: О чём здесь речь')).toBe(
      'О чём здесь речь',
    );
    expect(canonicalizeReadingModelLine('• Отдельная строка-метка ровно: Коротко о дне')).toBe(
      'Коротко о дне',
    );
    expect(canonicalizeReadingModelLine('Отдельная строка-метка ровно: О чем здесь речь')).toBe(
      'О чём здесь речь',
    );
  });

  it('sanitizeReadingModelText keeps body and normalizes labels', () => {
    const plain = [
      'Отдельная строка-метка ровно: О чём здесь речь',
      '',
      'Текст толкования.',
      'Пустая строка.',
      'Отдельная строка-метка ровно: Коротко о дне',
      '',
      'Итог дня.',
    ].join('\n');
    expect(sanitizeReadingModelText(plain)).toBe(
      'О чём здесь речь\n\nТекст толкования.\nКоротко о дне\n\nИтог дня.',
    );
  });
});
