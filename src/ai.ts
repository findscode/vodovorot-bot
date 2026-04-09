const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';

const SYSTEM_PROMPT =
  'Ты пишешь толкование по картам Таро для бота Водоворот. Строго соблюдай формат из запроса: строки-метки разделов — ровно как указано (без тире в конце названия метки), пустые строки между блоками; не сокращай и не переименовывай метки. Язык — только русский, целиком, без английских слов и кальки; названия карт уже по-русски. Пиши так, чтобы текст было легко читать в мессенджере: в основном короткие и средние предложения, без перегруженных фраз. Тон спокойный, взрослый, по-человечески ясный; без лести, без крика, без обращений вроде «дорогой друг» и без морализаторства. Только текст толкования. Не упоминай программы, нейросети, боты, API, серверы, модели и любую технику; не раскрывай, что ты «искусственный интеллект».';

interface CloudflareAiResponse {
  success?: boolean;
  result?: { response?: string };
  errors?: Array<{ message?: string; code?: number }>;
}

/** Путь как в curl из дашборда Cloudflare: /ai/run/@cf/meta/... — без encodeURIComponent всей строки. */
function runUrl(accountId: string, model: string): string {
  const id = accountId.trim();
  const m = model.trim();
  return `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/${m}`;
}

export async function completeChat(userPrompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL;

  if (!accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID не задан');
  }
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN не задан');
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
