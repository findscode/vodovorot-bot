import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTypingWhile } from './typingIndicator.js';

describe('withTypingWhile', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends typing while the task runs and never posts a wait notice', async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendChatAction = vi.fn().mockResolvedValue(undefined);
    const ctx = { chat: { id: 11 }, telegram: { sendChatAction, sendMessage } };
    let resolveTask!: (value: string) => void;
    const task = new Promise<string>((resolve) => {
      resolveTask = resolve;
    });

    const result = withTypingWhile(ctx as never, () => task);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sendChatAction.mock.calls.length).toBeGreaterThan(5);
    expect(sendChatAction).toHaveBeenCalledWith(11, 'typing');
    expect(sendMessage).not.toHaveBeenCalled();
    resolveTask('ok');
    await expect(result).resolves.toBe('ok');
  });

  it('runs the task without chat id', async () => {
    const ctx = { telegram: { sendChatAction: vi.fn() } };
    await expect(withTypingWhile(ctx as never, async () => 'ok')).resolves.toBe('ok');
    expect(ctx.telegram.sendChatAction).not.toHaveBeenCalled();
  });
});
