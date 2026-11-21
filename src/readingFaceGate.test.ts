import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST_FACE_DRAFT_DELAY_MS, settleAfterFaceBeforeDraft } from './readingFaceGate.js';

describe('settleAfterFaceBeforeDraft', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits the settle delay before resolving', async () => {
    vi.useFakeTimers();
    let done = false;
    const p = settleAfterFaceBeforeDraft().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(POST_FACE_DRAFT_DELAY_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });
});
