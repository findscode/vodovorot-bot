import { describe, expect, it } from 'vitest';
import { splitTripletModelOutput } from './modelOutput.js';

describe('splitTripletModelOutput', () => {
  it('splits user text and summary at РЕЗЮМЕ:', () => {
    const raw = 'Первый абзац.\n\nВторой.\n\nРЕЗЮМЕ: кратко для модели.';
    const { userText, summary } = splitTripletModelOutput(raw);
    expect(userText).toBe('Первый абзац.\n\nВторой.');
    expect(summary).toBe('кратко для модели.');
  });
});
