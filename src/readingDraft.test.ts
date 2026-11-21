import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftStreamer, draftPreviewHtml, draftStreamingEnabled } from './readingDraft.js';

describe('draftStreamingEnabled', () => {
  it('is on by default and off for kill-switch values', () => {
    expect(draftStreamingEnabled({})).toBe(true);
    expect(draftStreamingEnabled({ DRAFT_STREAMING_ENABLED: 'false' })).toBe(false);
  });
});

describe('draftPreviewHtml', () => {
  it('returns undefined for empty text', () => {
    expect(draftPreviewHtml('  \n', 'reading')).toBeUndefined();
  });

  it('escapes HTML in triplet mode', () => {
    expect(draftPreviewHtml('a < b', 'triplet')).toBe('a &lt; b');
  });

  it('bolds section labels in triplet mode', () => {
    expect(draftPreviewHtml('Слева\nОбраз.\n\nВывод\nГлавное.', 'triplet')).toBe(
      '<b>Слева</b>\nОбраз.\n\n<b>Вывод</b>\nГлавное.',
    );
  });

  it('hides the service summary in triplet mode', () => {
    expect(draftPreviewHtml('Текст шага.\nРЕЗЮМЕ: скрыто', 'triplet')).toBe('Текст шага.');
    expect(draftPreviewHtml('Текст шага.\nРЕЗЮ', 'triplet')).toBe('Текст шага.');
  });

  it('keeps the tail within the Telegram limit', () => {
    const html = draftPreviewHtml('слово '.repeat(2000), 'triplet')!;
    expect(html.length).toBeLessThanOrEqual(4096);
    expect(html.startsWith('…')).toBe(true);
  });
});

describe('DraftStreamer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a placeholder on start and throttles updates', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'triplet', minIntervalMs: 1000 });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenLastCalledWith(undefined);

    s.push('раз');
    s.push('раз два');
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('раз два');
    s.stop();
  });

  it('refreshes the draft with a heartbeat while the model is silent', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'reading', heartbeatMs: 8000 });
    s.start();
    await vi.advanceTimersByTimeAsync(8100);
    expect(send.mock.calls.length).toBeGreaterThanOrEqual(2);
    s.stop();
  });

  it('disables itself after a send error and reports it once', async () => {
    const send = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const s = new DraftStreamer({ send, mode: 'triplet', onError });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.push('текст');
    await vi.advanceTimersByTimeAsync(5000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('does not send after stop', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'triplet' });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.stop();
    s.push('поздно');
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
