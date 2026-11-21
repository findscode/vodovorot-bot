/** Разбор SSE-потока Chat Completions (`stream: true`) без сетевого кода. */

export type StreamState = {
  /** Видимый ответ модели. */
  content: string;
  /** Рассуждения модели (используются, только если ответа нет — как в обычном режиме). */
  reasoning: string;
  finishReason: string | null;
  /** Ошибка, пришедшая внутри потока. */
  error: string | null;
};

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function reasoningDetailsText(details: unknown): string {
  if (!Array.isArray(details)) return '';
  return details
    .map((d) => {
      if (!d || typeof d !== 'object') return '';
      const det = d as { type?: unknown; text?: unknown };
      return det.type === 'reasoning.text' ? textOf(det.text) : '';
    })
    .join('');
}

/**
 * Накопитель SSE: `push(chunk)` принимает куски текста потока в любых границах
 * и возвращает `true`, если видимый ответ вырос.
 */
export function createSseAccumulator(): {
  state: StreamState;
  push: (chunk: string) => boolean;
  flush: () => boolean;
} {
  const state: StreamState = { content: '', reasoning: '', finishReason: null, error: null };
  let buffer = '';

  function applyLine(rawLine: string): boolean {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) return false;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return false;
    let obj: unknown;
    try {
      obj = JSON.parse(payload);
    } catch {
      return false;
    }
    if (!obj || typeof obj !== 'object') return false;
    const data = obj as {
      error?: { message?: unknown } | string;
      choices?: { delta?: Record<string, unknown>; finish_reason?: unknown }[];
    };
    if (data.error !== undefined && data.error !== null) {
      state.error =
        typeof data.error === 'string' ? data.error : textOf(data.error.message) || 'stream_error';
    }
    const choice = data.choices?.[0];
    if (!choice) return false;
    if (typeof choice.finish_reason === 'string') state.finishReason = choice.finish_reason;
    const delta = choice.delta;
    if (!delta) return false;
    state.reasoning += textOf(delta.reasoning) + reasoningDetailsText(delta.reasoning_details);
    const piece = textOf(delta.content);
    if (piece) {
      state.content += piece;
      return true;
    }
    return false;
  }

  function drain(final: boolean): boolean {
    let grew = false;
    const lines = buffer.split('\n');
    buffer = final ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      if (applyLine(line)) grew = true;
    }
    return grew;
  }

  return {
    state,
    push(chunk: string): boolean {
      buffer += chunk;
      return drain(false);
    },
    flush(): boolean {
      return drain(true);
    },
  };
}
