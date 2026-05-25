import 'dotenv/config';
import { textLooksNonRussianDominant } from './aiRussianGate.js';
import { opsAiError, opsAiRequest } from './opsLog.js';
import { completeChatWithModelFallback } from './openRouterChat.js';

const SYSTEM_PROMPT =
  'Ты пишешь толкование по картам Таро для бота Водоворот. Строго соблюдай формат из запроса: строки-метки разделов — ровно как указано (без тире в конце названия метки), пустые строки между блоками; не сокращай и не переименовывай метки. Не пиши служебных фраз про оформление («Пустая строка», «пустая строка» и т.п.) и не описывай разметку текста — только содержание для читателя. Язык — только русский, целиком: норма современного русского литературного языка (согласование, падежи, естественный порядок слов); без английских и прочих иноязычных слов, без кальки и без латиницы в обычных словах; названия карт уже по-русски. Пиши так, чтобы текст было легко читать в мессенджере: в основном короткие и средние предложения, без перегруженных фраз. Тон спокойный, взрослый, по-человечески ясный; без лести, без крика, без обращений вроде «дорогой друг» и без морализаторства. Учитывай, что читатель может быть и новичком, и тем, кто давно с картами: не уводи в энциклопедичность и не поучай. Не называй конкретных дат и сроков; не отвечай на будущее бинарным «да» или «нет»; говори о вероятностях и направлениях, не об абсолютных гарантиях; у человека есть выбор — без запугивания и без слащавости. Без медицины, юриспруденции и финансовых советов. Только текст толкования. Не упоминай программы, нейросети, боты, API, серверы, модели и любую технику; не раскрывай, что ты «искусственный интеллект».';

/** Второй прогон: выровнять язык, не меняя структуру блоков из первого ответа. */
const RUSSIAN_POLISH_SYSTEM_PROMPT =
  'Ты редактор толкований Таро для русскоязычного Telegram-бота. Тебе дают текст, который должен быть полностью на русском, но иногда модель вставила английские абзацы или фразы. Твоя задача: переписать весь текст на естественный русский литературный язык, сохранив смысл, тон и структуру: те же строки-меток разделов (как в исходнике), те же пустые строки между блоками, тот же порядок частей. Убери служебные фразы про оформление («Пустая строка» и подобное), если они есть. Не добавляй предисловий («Конечно», «Вот перевод»), не комментируй процесс — только готовый текст толкования. Не упоминай ИИ, API, боты.';

export type CompleteChatOpts = {
  max_tokens?: number;
  opsContext?: string;
};

function polishUserPayload(firstPass: string): string {
  return `Ниже — текст толкования после первой генерации. Если в нём есть английские (или иные не-русские) фразы в основном тексте, устрани это: весь вывод должен быть по-русски, как в финальной выдаче читателю. Сохрани разметку HTML, если она есть (<b>…</b> и т.д.), и строки-метки разделов.\n\n---\n\n${firstPass}`;
}

function requireOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    opsAiError('config', 'missing_openrouter_api_key');
    console.error('[ai_error]', 'config', 'missing_openrouter_api_key');
    throw new Error('OPENROUTER_API_KEY не задан');
  }
  return apiKey;
}

async function timedFallback(
  apiKey: string,
  messages: { role: 'system' | 'user'; content: string }[],
  opts: { max_tokens: number; temperature: number },
  opsContext: string,
): Promise<string> {
  const started = Date.now();
  try {
    return await completeChatWithModelFallback(apiKey, messages, opts);
  } finally {
    opsAiRequest(opsContext, Date.now() - started);
  }
}

/** Служебный вызов модели без polish-pass (clarity и т.п.). */
export async function completeServiceChat(
  systemPrompt: string,
  userPrompt: string,
  opts: { max_tokens: number; temperature: number; opsContext?: string },
): Promise<string> {
  const apiKey = requireOpenRouterApiKey();
  return timedFallback(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    opts,
    opts.opsContext ?? 'clarity',
  );
}

export async function completeChat(userPrompt: string, opts?: CompleteChatOpts): Promise<string> {
  const apiKey = requireOpenRouterApiKey();
  const maxTokens = opts?.max_tokens ?? 1200;
  const opsContext = opts?.opsContext ?? 'reading';

  const first = await timedFallback(
    apiKey,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: maxTokens, temperature: 0.72 },
    opsContext,
  );

  if (!textLooksNonRussianDominant(first)) {
    console.log('[ai_success]');
    return first;
  }

  console.log('[ai_russian_polish] second pass');
  try {
    const polished = await timedFallback(
      apiKey,
      [
        { role: 'system', content: RUSSIAN_POLISH_SYSTEM_PROMPT },
        { role: 'user', content: polishUserPayload(first) },
      ],
      { max_tokens: Math.max(maxTokens + 400, 2200), temperature: 0.35 },
      `${opsContext}_polish`,
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
