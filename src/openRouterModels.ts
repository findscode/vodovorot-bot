/**
 * Бесплатные модели OpenRouter (`:free`), порядок = последовательный fallback.
 * Список можно уточнять на https://openrouter.ai/models?q=free
 */
export const OPENROUTER_FREE_MODEL_CHAIN = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'poolside/laguna-xs.2:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_FREE_MODEL_CHAIN)[number];
