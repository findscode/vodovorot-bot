/**
 * Прямые вызовы Bot API, которых нет в Telegraf 4.16 (Bot API 9.5+):
 * `sendMessageDraft`, `sendRichMessage`. JSON или multipart (для загрузки файлов).
 */

const DEFAULT_API_ROOT = 'https://api.telegram.org';
const REQUEST_TIMEOUT_MS = 30_000;

/** Минимум от `Telegraf['telegram']`: токен и корень API. */
export type TelegramApiTarget = {
  token: string;
  options?: { apiRoot?: string };
};

export type RawFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export class TelegramRawApiError extends Error {
  constructor(
    message: string,
    /** HTTP/Bot API код; `undefined` — сеть или таймаут. */
    readonly code?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'TelegramRawApiError';
  }
}

type ApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

function appendFormValue(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string') {
    form.append(key, value);
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    form.append(key, String(value));
  } else {
    form.append(key, JSON.stringify(value));
  }
}

function buildRequestInit(
  params: Record<string, unknown>,
  files: Record<string, RawFile>,
): RequestInit {
  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0) {
    return {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    };
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) {
    appendFormValue(form, key, value);
  }
  for (const [field, file] of fileEntries) {
    form.append(
      field,
      new Blob([new Uint8Array(file.buffer)], { type: file.contentType }),
      file.filename,
    );
  }
  return { method: 'POST', body: form };
}

/**
 * Вызывает метод Bot API напрямую. При `ok: false` бросает {@link TelegramRawApiError}.
 * Файлы передаются как `attach://<field>` внутри `params` — поля файлов задаются в `files`.
 */
export async function callTelegramRaw<T = unknown>(
  telegram: TelegramApiTarget,
  method: string,
  params: Record<string, unknown>,
  files: Record<string, RawFile> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const apiRoot = telegram.options?.apiRoot ?? DEFAULT_API_ROOT;
  const url = `${apiRoot}/bot${telegram.token}/${method}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      ...buildRequestInit(params, files),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    throw new TelegramRawApiError(
      `${method}: сеть недоступна`,
      undefined,
      e instanceof Error ? { cause: e } : undefined,
    );
  }

  let data: ApiResponse<T>;
  try {
    data = (await res.json()) as ApiResponse<T>;
  } catch (e) {
    throw new TelegramRawApiError(
      `${method}: ответ не JSON (HTTP ${res.status})`,
      res.status,
      e instanceof Error ? { cause: e } : undefined,
    );
  }
  if (!data.ok) {
    throw new TelegramRawApiError(
      `${method}: ${data.description ?? 'ошибка Bot API'}`,
      data.error_code ?? res.status,
    );
  }
  return data.result as T;
}
