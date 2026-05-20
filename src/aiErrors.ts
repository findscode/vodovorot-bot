import { OpenRouterChatError } from './openRouterChat.js';

/** Ошибка цепочки OpenRouter / `completeChat`, не сбой Telegram. */
export function isAiFailure(e: unknown): boolean {
  if (e instanceof OpenRouterChatError) return true;
  if (e instanceof Error && /OPENROUTER_API_KEY/i.test(e.message)) return true;
  return false;
}
