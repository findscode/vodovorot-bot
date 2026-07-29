/**
 * Бесплатные модели OpenRouter (`:free`), порядок = последовательный fallback.
 * Короткая цепочка (топ-3): меньше HTTP при сбоях free-tier / дневной квоте.
 * Список можно уточнять на https://openrouter.ai/models?q=free
 */
export const OPENROUTER_FREE_MODEL_CHAIN = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_FREE_MODEL_CHAIN)[number];
