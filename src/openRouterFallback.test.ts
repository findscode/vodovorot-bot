import { describe, expect, it } from 'vitest';
import {
  extractChatCompletion,
  extractChatCompletionContent,
  isFatalOpenRouterHttpStatus,
  isOpenRouterAccountLimitError,
  parseOpenRouterRetryDelayMs,
  shouldTryNextOpenRouterModel,
} from './openRouterFallback.js';

describe('openRouterFallback', () => {
  it('isFatalOpenRouterHttpStatus for 401 and 403', () => {
    expect(isFatalOpenRouterHttpStatus(401)).toBe(true);
    expect(isFatalOpenRouterHttpStatus(403)).toBe(true);
    expect(isFatalOpenRouterHttpStatus(429)).toBe(false);
    expect(isFatalOpenRouterHttpStatus(500)).toBe(false);
  });

  it('shouldTryNext on 429', () => {
    expect(shouldTryNextOpenRouterModel(429, '', null)).toBe(true);
  });

  it('isOpenRouterAccountLimitError detects quota / daily limit', () => {
    expect(
      isOpenRouterAccountLimitError('{"error":{"message":"Rate limit exceeded: daily limit"}}'),
    ).toBe(true);
    expect(isOpenRouterAccountLimitError('{"error":{"message":"Insufficient credits"}}')).toBe(
      true,
    );
    expect(
      isOpenRouterAccountLimitError('{"error":{"message":"Rate limit exceeded: 20/min"}}'),
    ).toBe(false);
    expect(isOpenRouterAccountLimitError('{"error":{"message":"No endpoints found"}}')).toBe(false);
  });

  it('shouldTryNext on 404 No endpoints found', () => {
    expect(
      shouldTryNextOpenRouterModel(404, '{"error":{"message":"No endpoints found"}}', null),
    ).toBe(true);
    expect(shouldTryNextOpenRouterModel(404, '{"error":{"message":"Not Found"}}', null)).toBe(
      false,
    );
  });

  it('shouldTryNext on 400 geo', () => {
    expect(
      shouldTryNextOpenRouterModel(
        400,
        '{"error":{"message":"User location is not supported"}}',
        null,
      ),
    ).toBe(true);
    expect(shouldTryNextOpenRouterModel(400, '{"error":{"message":"Invalid model"}}', null)).toBe(
      false,
    );
  });

  it('shouldTryNext on 200 with empty content', () => {
    expect(shouldTryNextOpenRouterModel(200, '{}', '')).toBe(true);
    expect(shouldTryNextOpenRouterModel(200, '{}', '   ')).toBe(true);
    expect(shouldTryNextOpenRouterModel(200, '{}', 'текст')).toBe(false);
  });

  it('shouldTryNext on 503 provider errors', () => {
    expect(shouldTryNextOpenRouterModel(503, 'Provider returned error', null)).toBe(true);
  });

  it('parseOpenRouterRetryDelayMs uses Retry-After header', () => {
    expect(parseOpenRouterRetryDelayMs(429, '{}', '2')).toBe(2000);
    expect(parseOpenRouterRetryDelayMs(200, '{}', '2')).toBe(0);
  });

  it('extractChatCompletionContent from reasoning field', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { role: 'assistant', content: null, reasoning: 'да' } }],
      }),
    ).toBe('да');
  });

  it('extractChatCompletionContent', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { role: 'assistant', content: '  Привет  ' } }],
      }),
    ).toBe('Привет');
    expect(extractChatCompletionContent({ choices: [{ message: { content: '' } }] })).toBeNull();
  });

  it('extractChatCompletion preserves finish_reason', () => {
    expect(
      extractChatCompletion({
        choices: [{ finish_reason: 'length', message: { content: 'Оборвано' } }],
      }),
    ).toEqual({ content: 'Оборвано', finishReason: 'length' });
  });
});
