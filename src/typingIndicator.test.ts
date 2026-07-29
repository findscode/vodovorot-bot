import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_LONG_WAIT_MESSAGE } from './botCopy.js';
import { withTypingWhile } from './typingIndicator.js';

describe('withTypingWhile', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not send a wait notice for a fast task', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: 10 },
      telegram: {
        sendChatAction: vi.fn().mockResolvedValue(undefined),
        sendMessage,
      },
    };

    await withTypingWhile(ctx as never, async () => 'ok');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends one notice when a task takes more than 20 seconds', async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: 11 },
      telegram: {
        sendChatAction: vi.fn().mockResolvedValue(undefined),
        sendMessage,
      },
    };
    let resolveTask!: (value: string) => void;
    const task = new Promise<string>((resolve) => {
      resolveTask = resolve;
    });

    const result = withTypingWhile(ctx as never, () => task);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith(11, AI_LONG_WAIT_MESSAGE);
    resolveTask('ok');
    await expect(result).resolves.toBe('ok');
  });
});
