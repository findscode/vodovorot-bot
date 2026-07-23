import { OPENROUTER_FREE_MODEL_CHAIN } from './openRouterModels.js';
import {
  extractChatCompletion,
  isFatalOpenRouterHttpStatus,
  parseOpenRouterErrorMessage,
  parseOpenRouterRetryDelayMs,
  shouldTryNextOpenRouterModel,
} from './openRouterFallback.js';
import { withOpenRouterRateLimit } from './openRouterRequestGate.js';
import { opsAiModelSuccess, opsEvent } from './opsLog.js';

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
): Promise<{
  status: number;
  bodyText: string;
  content: string | null;
  finishReason: string | null;
  retryAfterHeader: string | null;
}> {
  let res: Response;
  try {
    res = await withOpenRouterRateLimit(() =>
      fetch(OPENROUTER_CHAT_URL, {
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
      }),
    );
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
  let finishReason: string | null = null;
  if (res.ok) {
    try {
      ({ content, finishReason } = extractChatCompletion(JSON.parse(bodyText) as unknown));
    } catch {
      content = null;
    }
  }

  return {
    status: res.status,
    bodyText,
    content,
    finishReason,
    retryAfterHeader: res.headers.get('Retry-After'),
  };
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
  let truncationRetried = false;

  for (let i = 0; i < OPENROUTER_FREE_MODEL_CHAIN.length; i++) {
    const model = OPENROUTER_FREE_MODEL_CHAIN[i]!;
    let status: number;
    let bodyText: string;
    let content: string | null;
    let finishReason: string | null;
    let retryAfterHeader: string | null;
    try {
      ({ status, bodyText, content, finishReason, retryAfterHeader } = await fetchCompletion(
        apiKey,
        model,
        messages,
        opts,
      ));
    } catch (e) {
      if (e instanceof OpenRouterChatError && e.status === undefined) {
        console.warn('[openrouter_fallback]', model, 'network', e.message);
        lastError = e;
        if (OPENROUTER_FREE_MODEL_CHAIN[i + 1]) continue;
        break;
      }
      throw e;
    }

    if (status >= 200 && status < 300 && content && finishReason === 'length') {
      opsEvent('ai_truncated', { model });
      if (!truncationRetried) {
        truncationRetried = true;
        console.warn('[openrouter_retry]', model, 'finish_reason=length');
        try {
          ({ status, bodyText, content, finishReason, retryAfterHeader } = await fetchCompletion(
            apiKey,
            model,
            messages,
            { ...opts, max_tokens: opts.max_tokens + 400 },
          ));
        } catch (e) {
          if (e instanceof OpenRouterChatError) {
            console.warn('[openrouter_fallback]', model, 'retry_network', e.message);
            lastError = e;
            continue;
          }
          throw e;
        }
      }
      if (finishReason === 'length') {
        console.warn('[openrouter_fallback]', model, 'still_truncated');
        content = null;
      }
    }

    if (status >= 200 && status < 300 && content) {
      console.log('[openrouter_success]', model);
      opsAiModelSuccess(model);
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
      if (next) {
        const delayMs = parseOpenRouterRetryDelayMs(status, bodyText, retryAfterHeader);
        if (delayMs > 0) {
          console.warn('[openrouter_fallback] rate_limit_wait_ms', delayMs);
          await new Promise((r) => setTimeout(r, delayMs));
        }
        continue;
      }
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
