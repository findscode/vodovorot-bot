import { textLooksNonRussianDominant } from './aiRussianGate.js';

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

/** Cloudflare Account ID в дашборде — 32 hex-символа. */
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;
/** Имя модели Workers AI в пути URL: `@vendor/...`, без пробелов и обхода пути. */
const MODEL_RE = /^@[a-zA-Z0-9._/-]{1,200}$/;
const FETCH_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT =
  'Ты пишешь толкование по картам Таро для бота Водоворот. Строго соблюдай формат из запроса: строки-метки разделов — ровно как указано (без тире в конце названия метки), пустые строки между блоками; не сокращай и не переименовывай метки. Не пиши служебных фраз про оформление («Пустая строка», «пустая строка» и т.п.) и не описывай разметку текста — только содержание для читателя. Язык — только русский, целиком: норма современного русского литературного языка (согласование, падежи, естественный порядок слов); без английских и прочих иноязычных слов, без кальки и без латиницы в обычных словах; названия карт уже по-русски. Пиши так, чтобы текст было легко читать в мессенджере: в основном короткие и средние предложения, без перегруженных фраз. Тон спокойный, взрослый, по-человечески ясный; без лести, без крика, без обращений вроде «дорогой друг» и без морализаторства. Учитывай, что читатель может быть и новичком, и тем, кто давно с картами: не уводи в энциклопедичность и не поучай. Только текст толкования. Не упоминай программы, нейросети, боты, API, серверы, модели и любую технику; не раскрывай, что ты «искусственный интеллект».';

/** Второй прогон: выровнять язык, не меняя структуру блоков из первого ответа. */
const RUSSIAN_POLISH_SYSTEM_PROMPT =
  'Ты редактор толкований Таро для русскоязычного Telegram-бота. Тебе дают текст, который должен быть полностью на русском, но иногда модель вставила английские абзацы или фразы. Твоя задача: переписать весь текст на естественный русский литературный язык, сохранив смысл, тон и структуру: те же строки-меток разделов (как в исходнике), те же пустые строки между блоками, тот же порядок частей. Убери служебные фразы про оформление («Пустая строка» и подобное), если они есть. Не добавляй предисловий («Конечно», «Вот перевод»), не комментируй процесс — только готовый текст толкования. Не упоминай ИИ, API, боты.';

interface CloudflareAiResponse {
  success?: boolean;
  result?: { response?: string };
  errors?: Array<{ message?: string; code?: number }>;
}

type ChatMessage = { role: 'system' | 'user'; content: string };

/** Путь как в curl из дашборда Cloudflare: /ai/run/@cf/meta/... — без encodeURIComponent всей строки. */
function runUrl(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

async function runWorkersAi(
  accountId: string,
  token: string,
  model: string,
  messages: ChatMessage[],
  opts: { max_tokens: number; temperature: number },
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(runUrl(accountId, model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: opts.max_tokens,
        temperature: opts.temperature,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      console.error('[ai_error]', 'timeout');
      throw new Error('Превышено время ожидания ответа ИИ', { cause: e });
    }
    console.error('[ai_error]', 'network', e instanceof Error ? e.name : 'unknown');
    throw e;
  }

  const rawBody = await res.text();
  let data: CloudflareAiResponse;
  try {
    data = JSON.parse(rawBody) as CloudflareAiResponse;
  } catch {
    console.error('[ai_error]', 'json_parse', res.status);
    throw new Error(`ИИ API: некорректный ответ (${res.status})`);
  }

  if (!res.ok || data.success === false) {
    const fromApi = data.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join('; ');
    console.error(
      '[ai_error]',
      'api_response',
      res.status,
      fromApi ? '(errors array present)' : '',
    );
    throw new Error(`ИИ API ${res.status}`);
  }

  const out = data.result?.response;
  const content = typeof out === 'string' ? out.trim() : '';
  if (!content) {
    console.error('[ai_error]', 'empty_result');
    throw new Error('Пустой ответ от ИИ');
  }
  return content;
}

function polishUserPayload(firstPass: string): string {
  return `Ниже — текст толкования после первой генерации. Если в нём есть английские (или иные не-русские) фразы в основном тексте, устрани это: весь вывод должен быть по-русски, как в финальной выдаче читателю. Сохрани разметку HTML, если она есть (<b>…</b> и т.д.), и строки-метки разделов.\n\n---\n\n${firstPass}`;
}

export async function completeChat(userPrompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model = (process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL).trim();

  if (!accountId) {
    console.error('[ai_error]', 'config', 'missing_account_id');
    throw new Error('CLOUDFLARE_ACCOUNT_ID не задан');
  }
  if (!ACCOUNT_ID_RE.test(accountId)) {
    console.error('[ai_error]', 'config', 'bad_account_id');
    throw new Error('CLOUDFLARE_ACCOUNT_ID должен быть 32-символьным hex-идентификатором');
  }
  if (!token) {
    console.error('[ai_error]', 'config', 'missing_token');
    throw new Error('CLOUDFLARE_API_TOKEN не задан');
  }
  if (!MODEL_RE.test(model)) {
    console.error('[ai_error]', 'config', 'bad_model');
    throw new Error('CLOUDFLARE_AI_MODEL имеет недопустимый формат');
  }

  const first = await runWorkersAi(
    accountId,
    token,
    model,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: 1200, temperature: 0.72 },
  );

  if (!textLooksNonRussianDominant(first)) {
    console.log('[ai_success]');
    return first;
  }

  console.log('[ai_russian_polish] second pass');
  try {
    const polished = await runWorkersAi(
      accountId,
      token,
      model,
      [
        { role: 'system', content: RUSSIAN_POLISH_SYSTEM_PROMPT },
        { role: 'user', content: polishUserPayload(first) },
      ],
      { max_tokens: 2200, temperature: 0.35 },
    );
    if (textLooksNonRussianDominant(polished)) {
      console.warn('[ai_russian_polish] still looks latin-heavy after polish; using polished text');
    }
    console.log('[ai_success]');
    return polished;
  } catch (e) {
    console.error('[ai_russian_polish]', 'failed', e instanceof Error ? e.message : e);
    console.log('[ai_success]');
    return first;
  }
}
