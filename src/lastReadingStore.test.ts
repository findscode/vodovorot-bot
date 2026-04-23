import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLastReading, saveLastReading } from './lastReadingStore.js';

describe('lastReadingStore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when empty', () => {
    expect(getLastReading(42)).toBeNull();
  });

  it('returns saved text until TTL expires', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    saveLastReading(1, 'О чём здесь речь\n\nТекст.');
    expect(getLastReading(1)).toBe('О чём здесь речь\n\nТекст.');
    vi.setSystemTime(now + 24 * 60 * 60 * 1000 - 1);
    expect(getLastReading(1)).toBe('О чём здесь речь\n\nТекст.');
    vi.setSystemTime(now + 24 * 60 * 60 * 1000 + 1);
    expect(getLastReading(1)).toBeNull();
  });
});
