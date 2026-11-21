import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftStreamer, draftPreviewHtml, draftStreamingEnabled } from './readingDraft.js';
import { TelegramRawApiError } from './telegramRawApi.js';

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

  it('bolds section labels and spaces sections like the final message', () => {
    expect(draftPreviewHtml('Слева\nОбраз.\nВывод\nГлавное.', 'triplet')).toBe(
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

function apiError(code: number | undefined, retryAfterSec?: number): TelegramRawApiError {
  return new TelegramRawApiError('sendMessageDraft: fail', code, { retryAfterSec });
}

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
    expect(send).toHaveBeenLastCalledWith(undefined, undefined);

    s.push('раз');
    s.push('раз два');
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('раз два', 'HTML');
    await s.stop();
  });

  it('counts the throttle from the start of the previous send', async () => {
    let finish!: () => void;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'reading', minIntervalMs: 1000 });
    s.start();
    s.push('текст');
    await vi.advanceTimersByTimeAsync(800);
    finish();
    await vi.advanceTimersByTimeAsync(250);
    expect(send).toHaveBeenCalledTimes(2);
    await s.stop();
  });

  it('refreshes the draft while the model is silent', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'reading', heartbeatMs: 8000 });
    s.start();
    await vi.advanceTimersByTimeAsync(7000);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3100);
    expect(send).toHaveBeenCalledTimes(2);
    await s.stop();
  });

  it('keeps streaming after a single network error', async () => {
    const send = vi.fn().mockRejectedValueOnce(apiError(undefined)).mockResolvedValue(undefined);
    const onError = vi.fn();
    const s = new DraftStreamer({ send, mode: 'triplet', onError });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.push('текст');
    await vi.advanceTimersByTimeAsync(2000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith('текст', 'HTML');
    await s.stop();
  });

  it('stops after three network errors in a row', async () => {
    const send = vi.fn().mockRejectedValue(apiError(502));
    const s = new DraftStreamer({ send, mode: 'triplet', onError: vi.fn() });
    s.start();
    for (const t of ['а', 'аб', 'абв', 'абвг', 'абвгд']) {
      s.push(t);
      await vi.advanceTimersByTimeAsync(1500);
    }
    expect(send).toHaveBeenCalledTimes(3);
    await s.stop();
  });

  it('waits for retry_after on 429 and then sends the latest text', async () => {
    const send = vi.fn().mockRejectedValueOnce(apiError(429, 5)).mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'reading', onError: vi.fn() });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.push('новый текст');
    await vi.advanceTimersByTimeAsync(4000);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(send).toHaveBeenLastCalledWith('новый текст', 'HTML');
    await s.stop();
  });

  it('switches to plain text after a 400 and gives up after the second one', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(apiError(400))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(apiError(400));
    const s = new DraftStreamer({ send, mode: 'reading', onError: vi.fn() });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.push('Итог\nа < б');
    await vi.advanceTimersByTimeAsync(2500);
    expect(send).toHaveBeenLastCalledWith('Итог\nа < б', undefined);
    s.push('Итог\nа < б, ещё');
    await vi.advanceTimersByTimeAsync(1000);
    s.push('Итог\nа < б, ещё раз');
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenCalledTimes(4);
    await s.stop();
  });

  it('disables itself right away on 404', async () => {
    const send = vi.fn().mockRejectedValue(apiError(404));
    const onError = vi.fn();
    const s = new DraftStreamer({ send, mode: 'triplet', onError });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    s.push('текст');
    await vi.advanceTimersByTimeAsync(5000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    await s.stop();
  });

  it('does not send after stop', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const s = new DraftStreamer({ send, mode: 'triplet' });
    s.start();
    await vi.advanceTimersByTimeAsync(0);
    await s.stop();
    s.push('поздно');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('stop waits for the send in flight', async () => {
    let finish!: () => void;
    const send = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const s = new DraftStreamer({ send, mode: 'reading' });
    s.start();
    let stopped = false;
    const stopping = s.stop().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(stopped).toBe(false);
    finish();
    await stopping;
    expect(stopped).toBe(true);
  });

  it('stop does not wait forever for a hung send', async () => {
    const send = vi.fn().mockImplementation(() => new Promise<void>(() => {}));
    const s = new DraftStreamer({ send, mode: 'reading', stopWaitMs: 500 });
    s.start();
    let stopped = false;
    void s.stop().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(600);
    expect(stopped).toBe(true);
  });
});
