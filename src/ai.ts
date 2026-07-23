import 'dotenv/config';
import { textLooksNonRussianDominant } from './aiRussianGate.js';
import { sanitizeReadingModelText } from './brandFormat.js';
import { opsAiError, opsAiRequest, opsEvent } from './opsLog.js';
import { completeChatWithModelFallback } from './openRouterChat.js';

const SYSTEM_PROMPT =
  'Ты пишешь толкования Таро для Водоворота. Выводи только готовый текст на грамотном естественном русском языке, без латиницы и переводных оборотов. Строго соблюдай каркас из запроса: не переименовывай метки, не добавляй вступление и не повторяй инструкции. Пиши короткими и средними предложениями; тон спокойный, взрослый и ясный, без лести, запугивания, морализаторства и энциклопедичности. Не упоминай программы, модели и другую технику. Правила безопасности из запроса обязательны.';

/** Второй прогон: выровнять язык, не меняя структуру блоков из первого ответа. */
const RUSSIAN_POLISH_SYSTEM_PROMPT =
  'Ты редактор толкований Таро. Перепиши иноязычные фрагменты на естественный русский, сохрани смысл, порядок, метки и пустые строки. Сохрани естественные упоминания толкователя, но не добавляй о нём отдельную шапку. Удали служебные фразы о формате. Выведи только готовый текст.';

const FORMAT_REPAIR_SYSTEM_PROMPT =
  'Ты редактор толкований Таро. Восстанови обязательные метки и разложи исходный смысл по ним. Не добавляй новых выводов, вступления или комментарии о работе. Выведи только исправленный текст.';

const REQUIRED_LABELS_BY_CONTEXT: Record<string, readonly string[]> = {
  day: ['О чём здесь речь', 'Коротко о дне'],
  spread: ['Прошлое', 'Настоящее', 'Будущее', 'Как это сходится'],
};

export type CompleteChatOpts = {
  max_tokens?: number;
  opsContext?: string;
};

function polishUserPayload(firstPass: string): string {
  return `Исправь язык этого толкования, сохранив структуру:\n\n${firstPass}`;
}

function hasRequiredLabels(text: string, labels: readonly string[]): boolean {
  const lines = new Set(
    sanitizeReadingModelText(text)
      .split('\n')
      .map((line) => line.trim()),
  );
  return labels.every((label) => lines.has(label));
}

async function repairReadingFormatIfNeeded(
  apiKey: string,
  text: string,
  opsContext: string,
  maxTokens: number,
): Promise<string> {
  const labels = REQUIRED_LABELS_BY_CONTEXT[opsContext];
  if (!labels || hasRequiredLabels(text, labels)) return text;

  opsEvent('reading_format_thin', { context: opsContext });
  console.warn('[ai_format_repair]', opsContext, 'missing_labels');
  try {
    const repaired = await timedFallback(
      apiKey,
      [
        { role: 'system', content: FORMAT_REPAIR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Обязательные метки по порядку:\n${labels.join('\n')}\n\nИсходный текст:\n${text}`,
        },
      ],
      { max_tokens: Math.max(maxTokens + 200, 1400), temperature: 0.25 },
      `${opsContext}_format_repair`,
    );
    return hasRequiredLabels(repaired, labels) ? repaired : text;
  } catch (e) {
    console.warn('[ai_format_repair]', opsContext, e instanceof Error ? e.message : e);
    return text;
  }
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

  let finalText = first;
  if (textLooksNonRussianDominant(first)) {
    console.log('[ai_russian_polish] second pass');
    try {
      finalText = await timedFallback(
        apiKey,
        [
          { role: 'system', content: RUSSIAN_POLISH_SYSTEM_PROMPT },
          { role: 'user', content: polishUserPayload(first) },
        ],
        { max_tokens: Math.max(maxTokens + 400, 2200), temperature: 0.35 },
        `${opsContext}_polish`,
      );
      if (textLooksNonRussianDominant(finalText)) {
        console.warn('[ai_russian_polish] still looks latin-heavy after polish');
      }
    } catch (e) {
      console.error('[ai_russian_polish]', 'failed', e instanceof Error ? e.message : e);
      finalText = first;
    }
  }

  finalText = await repairReadingFormatIfNeeded(apiKey, finalText, opsContext, maxTokens);
  console.log('[ai_success]');
  return finalText;
}
