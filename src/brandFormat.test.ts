import { describe, expect, it } from 'vitest';
import {
  canonicalizeReadingModelLine,
  normalizeReadingLayout,
  sanitizeReadingModelText,
} from './brandFormat.js';

describe('normalizeReadingLayout', () => {
  it('puts one empty line before each label and none between label and body', () => {
    const plain = 'Прошлое\n\nОбраз прошлого.\nНастоящее\nОбраз сейчас.\n\n\n\nИтог\n\nГлавное.';
    expect(normalizeReadingLayout(plain)).toBe(
      'Прошлое\nОбраз прошлого.\n\nНастоящее\nОбраз сейчас.\n\nИтог\nГлавное.',
    );
  });

  it('separates the closing phrase from the last section', () => {
    const plain = 'О чём здесь речь\nСмысл.\nКоротко о дне\nВывод дня.\nФинальная фраза.';
    expect(normalizeReadingLayout(plain)).toBe(
      'О чём здесь речь\nСмысл.\n\nКоротко о дне\nВывод дня.\n\nФинальная фраза.',
    );
  });

  it('keeps paragraphs apart in text without labels', () => {
    expect(normalizeReadingLayout('  Первый абзац.\nВторой абзац.\n\n\nТретий.  ')).toBe(
      'Первый абзац.\n\nВторой абзац.\n\nТретий.',
    );
  });

  it('keeps a label without body on its own', () => {
    expect(normalizeReadingLayout('Вывод\n\nИтог\nТекст.')).toBe('Вывод\n\nИтог\nТекст.');
  });

  it('is idempotent', () => {
    const once = normalizeReadingLayout('Слева\nА.\nВ центре\nБ.\nВывод\nВ.\nЗакрытие.');
    expect(normalizeReadingLayout(once)).toBe(once);
  });
});

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
