const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';

/** Cloudflare Account ID в дашборде — 32 hex-символа. */
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;
/** Имя модели Workers AI в пути URL: `@vendor/...`, без пробелов и обхода пути. */
const MODEL_RE = /^@[a-zA-Z0-9._/-]{1,200}$/;
const FETCH_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT =
  'Ты пишешь толкование по картам Таро для бота Водоворот. Строго соблюдай формат из запроса: строки-метки разделов — ровно как указано (без тире в конце названия метки), пустые строки между блоками; не сокращай и не переименовывай метки. Язык — только русский, целиком, без английских слов и кальки; названия карт уже по-русски. Пиши так, чтобы текст было легко читать в мессенджере: в основном короткие и средние предложения, без перегруженных фраз. Тон спокойный, взрослый, по-человечески ясный; без лести, без крика, без обращений вроде «дорогой друг» и без морализаторства. Только текст толкования. Не упоминай программы, нейросети, боты, API, серверы, модели и любую технику; не раскрывай, что ты «искусственный интеллект».';

interface CloudflareAiResponse {
  success?: boolean;
  result?: { response?: string };
  errors?: Array<{ message?: string; code?: number }>;
}

/** Путь как в curl из дашборда Cloudflare: /ai/run/@cf/meta/... — без encodeURIComponent всей строки. */
function runUrl(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

export async function completeChat(userPrompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model = (process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL).trim();

  if (!accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID не задан');
  }
  if (!ACCOUNT_ID_RE.test(accountId)) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID должен быть 32-символьным hex-идентификатором');
  }
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN не задан');
  }
  if (!MODEL_RE.test(model)) {
    throw new Error('CLOUDFLARE_AI_MODEL имеет недопустимый формат');
  }

  const res = await fetch(runUrl(accountId, model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const rawBody = await res.text();
  let data: CloudflareAiResponse;
  try {
    data = JSON.parse(rawBody) as CloudflareAiResponse;
  } catch {
    throw new Error(`ИИ API ${res.status}: ${rawBody.slice(0, 500)}`);
  }

  if (!res.ok || data.success === false) {
    const fromApi = data.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join('; ');
    const detail = fromApi || rawBody.slice(0, 500);
    throw new Error(`ИИ API ${res.status}: ${detail}`);
  }

  const out = data.result?.response;
  const content = typeof out === 'string' ? out.trim() : '';
  if (!content) {
    throw new Error('Пустой ответ от ИИ');
  }
  return content;
}
