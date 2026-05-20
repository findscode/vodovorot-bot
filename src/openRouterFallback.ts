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

/** Переход к следующей модели в цепочке. */
export function shouldTryNextOpenRouterModel(
  status: number,
  bodyText: string,
  content: string | null,
): boolean {
  if (status === 429) return true;
  if (status === 404 && NO_ENDPOINTS_RE.test(bodyText)) return true;
  if (status === 400) {
    const msg = parseOpenRouterErrorMessage(bodyText);
    if (GEO_PROVIDER_RE.test(msg) || GEO_PROVIDER_RE.test(bodyText)) return true;
  }
  if (status >= 200 && status < 300 && !content?.trim()) return true;
  return false;
}

export function extractChatCompletionContent(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!first || typeof first !== 'object') return null;
  const message = (first as { message?: { content?: unknown } }).message;
  const raw = message?.content;
  if (typeof raw === 'string') return raw.trim() || null;
  return null;
}
