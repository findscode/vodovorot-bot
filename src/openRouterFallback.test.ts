import { describe, expect, it } from 'vitest';
import {
  extractChatCompletionContent,
  isFatalOpenRouterHttpStatus,
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

  it('extractChatCompletionContent', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { role: 'assistant', content: '  Привет  ' } }],
      }),
    ).toBe('Привет');
    expect(extractChatCompletionContent({ choices: [{ message: { content: '' } }] })).toBeNull();
  });
});
