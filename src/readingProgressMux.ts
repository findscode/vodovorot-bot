import type { ReadingProgress } from './readingDraft.js';

/**
 * Ранний прогресс ИИ (пока собирается/шлётся фото) без Telegram-черновика;
 * после фото подписываем draft на тот же поток.
 */
export function createReadingProgressMux(): {
  push: ReadingProgress;
  bind: (onProgress: ReadingProgress) => () => void;
} {
  let latest = '';
  const listeners = new Set<ReadingProgress>();
  return {
    push: (text) => {
      latest = text;
      for (const listener of listeners) listener(text);
    },
    bind: (onProgress) => {
      listeners.add(onProgress);
      if (latest.length > 0) onProgress(latest);
      return () => {
        listeners.delete(onProgress);
      };
    },
  };
}
