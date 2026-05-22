import { describe, expect, it } from 'vitest';
import { splitTripletModelOutput } from './modelOutput.js';

describe('splitTripletModelOutput', () => {
  it('splits user text and summary at РЕЗЮМЕ:', () => {
    const raw = 'Первый абзац.\n\nВторой.\n\nРЕЗЮМЕ: кратко для модели.';
    const { userText, summary } = splitTripletModelOutput(raw);
    expect(userText).toBe('Первый абзац.\n\nВторой.');
    expect(summary).toBe('кратко для модели.');
  });

  it('uses full text when РЕЗЮМЕ marker missing', () => {
    const raw = 'Только ответ без служебной строки.';
    const { userText, summary } = splitTripletModelOutput(raw);
    expect(userText).toBe(raw);
    expect(summary).toBe(raw);
  });
});
