import { describe, expect, it, vi, beforeEach } from 'vitest';
import { evaluateQuestionClarity, parseClarityModelJson } from './questionClarity.js';

vi.mock('./ai.js', () => ({
  completeServiceChat: vi.fn(),
}));

import { completeServiceChat } from './ai.js';

const mockComplete = vi.mocked(completeServiceChat);

describe('parseClarityModelJson', () => {
  it('parses valid JSON', () => {
    expect(parseClarityModelJson('{"needs_clarification":true,"hint":"Уточни сферу"}')).toEqual({
      needs_clarification: true,
      hint: 'Уточни сферу',
    });
  });

  it('extracts JSON from surrounding text', () => {
    expect(parseClarityModelJson('Ответ:\n{"needs_clarification":false,"hint":""}\n')).toEqual({
      needs_clarification: false,
      hint: '',
    });
  });

  it('returns null for invalid payload', () => {
    expect(parseClarityModelJson('not json')).toBeNull();
    expect(parseClarityModelJson('{"hint":"x"}')).toBeNull();
  });
});

describe('evaluateQuestionClarity', () => {
  beforeEach(() => {
    mockComplete.mockReset();
  });

  it('fail-open when AI throws', async () => {
    mockComplete.mockRejectedValue(new Error('timeout'));
    await expect(evaluateQuestionClarity('что будет?')).resolves.toEqual({ action: 'proceed' });
  });

  it('fail-open when JSON invalid', async () => {
    mockComplete.mockResolvedValue('sorry');
    await expect(evaluateQuestionClarity('что будет?')).resolves.toEqual({ action: 'proceed' });
  });

  it('returns clarify when model asks', async () => {
    mockComplete.mockResolvedValue('{"needs_clarification":true,"hint":"Уточни сферу"}');
    await expect(evaluateQuestionClarity('что будет?')).resolves.toEqual({
      action: 'clarify',
      hint: 'Уточни сферу',
    });
  });
});
