/**
 * Бесплатные модели OpenRouter (`:free`), порядок = последовательный fallback.
 * Список можно уточнять на https://openrouter.ai/models?q=free
 */
export const OPENROUTER_FREE_MODEL_CHAIN = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_FREE_MODEL_CHAIN)[number];
