/** Классификация ответа OpenRouter для цепочки fallback (см. docs/DEPLOY.md). */

const NO_ENDPOINTS_RE = /no endpoints found/i;
const GEO_PROVIDER_RE =
  /user location is not supported|failed_precondition|provider.*not supported|region|geo/i;

export function parseOpenRouterErrorMessage(bodyText: string): string {
  try {
    const data = JSON.parse(bodyText) as { error?: { message?: string } };
    const msg = data.error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  } catch {
    /* not JSON */
  }
  return bodyText.slice(0, 500);
}

/** 401/403 и прочие — не перебираем модели, запрос считаем проваленным. */
export function isFatalOpenRouterHttpStatus(status: number): boolean {
  return status === 401 || status === 403;
}

const ACCOUNT_LIMIT_RE =
  /daily\s*(limit|quota)|quota\s*exceeded|usage\s*limit|insufficient\s*credits|credit\s*limit|free\s*tier.*limit/i;

/** Дневная/аккаунтная квота — дальше по цепочке смысла нет, только жжём лимит. */
export function isOpenRouterAccountLimitError(bodyText: string): boolean {
  const msg = parseOpenRouterErrorMessage(bodyText);
  return ACCOUNT_LIMIT_RE.test(msg) || ACCOUNT_LIMIT_RE.test(bodyText);
}

/** Переход к следующей модели в цепочке. */
export function shouldTryNextOpenRouterModel(
  status: number,
  bodyText: string,
  content: string | null,
): boolean {
  if (status === 429) return true;
  if (status === 404 && NO_ENDPOINTS_RE.test(bodyText)) return true;
  if (status === 502 || status === 503 || status === 504 || status === 529) return true;
  if (status === 400) {
    const msg = parseOpenRouterErrorMessage(bodyText);
    if (GEO_PROVIDER_RE.test(msg) || GEO_PROVIDER_RE.test(bodyText)) return true;
  }
  if (status >= 200 && status < 300 && !content?.trim()) return true;
  return false;
}

const MAX_429_BACKOFF_MS = 12_000;

/** Пауза перед следующей моделью при 429 (секунды из заголовка или metadata). */
export function parseOpenRouterRetryDelayMs(
  status: number,
  bodyText: string,
  retryAfterHeader: string | null,
): number {
  if (status !== 429) return 0;
  if (retryAfterHeader) {
    const sec = Number(retryAfterHeader);
    if (Number.isFinite(sec) && sec > 0) {
      return Math.min(Math.ceil(sec * 1000), MAX_429_BACKOFF_MS);
    }
  }
  try {
    const data = JSON.parse(bodyText) as {
      error?: { metadata?: { headers?: Record<string, string> } };
    };
    const reset = data.error?.metadata?.headers?.['X-RateLimit-Reset'];
    if (reset) {
      const resetMs = Number(reset);
      if (Number.isFinite(resetMs) && resetMs > Date.now()) {
        return Math.min(resetMs - Date.now(), MAX_429_BACKOFF_MS);
      }
    }
  } catch {
    /* ignore */
  }
  return 5_000;
}

function textFromAssistantMessage(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const m = message as Record<string, unknown>;
  const raw = m.content;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s) return s;
  }
  if (Array.isArray(raw)) {
    const joined = raw
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        const p = part as { type?: string; text?: string };
        if (p.type === 'text' && typeof p.text === 'string') return p.text;
        return '';
      })
      .join('')
      .trim();
    if (joined) return joined;
  }
  if (typeof m.reasoning === 'string') {
    const s = m.reasoning.trim();
    if (s) return s;
  }
  const details = m.reasoning_details;
  if (Array.isArray(details)) {
    const joined = details
      .map((d) => {
        if (!d || typeof d !== 'object') return '';
        const det = d as { type?: string; text?: string };
        if (det.type === 'reasoning.text' && typeof det.text === 'string') return det.text;
        return '';
      })
      .join('')
      .trim();
    if (joined) return joined;
  }
  return null;
}

export type ExtractedChatCompletion = {
  content: string | null;
  finishReason: string | null;
};

export function extractChatCompletion(data: unknown): ExtractedChatCompletion {
  if (!data || typeof data !== 'object') return { content: null, finishReason: null };
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return { content: null, finishReason: null };
  }
  const first = choices[0];
  if (!first || typeof first !== 'object') {
    return { content: null, finishReason: null };
  }
  const choice = first as { message?: unknown; finish_reason?: unknown };
  return {
    content: textFromAssistantMessage(choice.message),
    finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
  };
}

export function extractChatCompletionContent(data: unknown): string | null {
  return extractChatCompletion(data).content;
}
