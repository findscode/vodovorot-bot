/**
 * Бесплатные модели OpenRouter (`:free`), порядок = последовательный fallback.
 * Список можно уточнять на https://openrouter.ai/models?q=free
 */
export const OPENROUTER_FREE_MODEL_CHAIN = [
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'google/gemma-3-27b-it:free',
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_FREE_MODEL_CHAIN)[number];
