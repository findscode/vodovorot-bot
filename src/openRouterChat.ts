import { OPENROUTER_FREE_MODEL_CHAIN } from './openRouterModels.js';
import {
  extractChatCompletionContent,
  isFatalOpenRouterHttpStatus,
  parseOpenRouterErrorMessage,
  shouldTryNextOpenRouterModel,
} from './openRouterFallback.js';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FETCH_TIMEOUT_MS = 120_000;

export type ChatMessage = { role: 'system' | 'user'; content: string };

export type ChatCompletionOpts = {
  max_tokens: number;
  temperature: number;
};

export class OpenRouterChatError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly model?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'OpenRouterChatError';
  }
}

async function fetchCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: ChatCompletionOpts,
): Promise<{ status: number; bodyText: string; content: string | null }> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/findscode/vodovorot-bot',
        'X-OpenRouter-Title': 'Vodovorot Tarot Bot',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.max_tokens,
        temperature: opts.temperature,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new OpenRouterChatError('Превышено время ожидания ответа ИИ', undefined, model, {
        cause: e,
      });
    }
    throw new OpenRouterChatError(
      'Сеть недоступна при запросе к ИИ',
      undefined,
      model,
      e instanceof Error ? { cause: e } : undefined,
    );
  }

  const bodyText = await res.text();
  let content: string | null = null;
  if (res.ok) {
    try {
      content = extractChatCompletionContent(JSON.parse(bodyText) as unknown);
    } catch {
      content = null;
    }
  }

  return { status: res.status, bodyText, content };
}

/**
 * Chat Completions с последовательным fallback по OPENROUTER_FREE_MODEL_CHAIN.
 */
export async function completeChatWithModelFallback(
  apiKey: string,
  messages: ChatMessage[],
  opts: ChatCompletionOpts,
): Promise<string> {
  let lastError: OpenRouterChatError | null = null;

  for (let i = 0; i < OPENROUTER_FREE_MODEL_CHAIN.length; i++) {
    const model = OPENROUTER_FREE_MODEL_CHAIN[i]!;
    let status: number;
    let bodyText: string;
    let content: string | null;
    try {
      ({ status, bodyText, content } = await fetchCompletion(apiKey, model, messages, opts));
    } catch (e) {
      if (e instanceof OpenRouterChatError && e.status === undefined) {
        console.warn('[openrouter_fallback]', model, 'network', e.message);
        lastError = e;
        if (OPENROUTER_FREE_MODEL_CHAIN[i + 1]) continue;
        break;
      }
      throw e;
    }

    if (status >= 200 && status < 300 && content) {
      console.log('[openrouter_success]', model);
      return content;
    }

    if (isFatalOpenRouterHttpStatus(status)) {
      const msg = parseOpenRouterErrorMessage(bodyText);
      console.error('[openrouter_error]', 'fatal', status, model, msg.slice(0, 120));
      throw new OpenRouterChatError(`ИИ API ${status}: ${msg}`, status, model);
    }

    if (shouldTryNextOpenRouterModel(status, bodyText, content)) {
      console.warn('[openrouter_fallback]', model, status, content ? 'empty_content' : '');
      lastError = new OpenRouterChatError(
        parseOpenRouterErrorMessage(bodyText) || `ИИ API ${status}`,
        status,
        model,
      );
      const next = OPENROUTER_FREE_MODEL_CHAIN[i + 1];
      if (next) continue;
      break;
    }

    const msg = parseOpenRouterErrorMessage(bodyText);
    console.error('[openrouter_error]', status, model, msg.slice(0, 120));
    throw new OpenRouterChatError(`ИИ API ${status}: ${msg}`, status, model);
  }

  throw (
    lastError ??
    new OpenRouterChatError('Все модели OpenRouter free-tier недоступны', undefined, undefined)
  );
}
