import { describe, expect, it } from 'vitest';
import { isAiFailure } from './aiErrors.js';
import { OpenRouterChatError } from './openRouterChat.js';

describe('isAiFailure', () => {
  it('true for OpenRouterChatError', () => {
    expect(isAiFailure(new OpenRouterChatError('timeout', 504))).toBe(true);
  });

  it('true for missing API key message', () => {
    expect(isAiFailure(new Error('OPENROUTER_API_KEY не задан'))).toBe(true);
  });

  it('false for generic Telegram-like errors', () => {
    expect(isAiFailure(new Error('ETELEGRAM: 400 Bad Request'))).toBe(false);
  });
});
