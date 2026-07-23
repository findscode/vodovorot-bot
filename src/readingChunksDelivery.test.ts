import { describe, expect, it, vi } from 'vitest';
import { sendPlainReadingChunksToChat, sendReadingChunksToChat } from './readingChunksDelivery.js';

describe('readingChunksDelivery', () => {
  it('sendReadingChunksToChat stops when shouldContinue returns false', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const telegram = { sendMessage } as never;
    let calls = 0;
    await sendReadingChunksToChat(telegram, 1, 'А'.repeat(4500), 10, {
      shouldContinue: () => {
        calls += 1;
        return calls < 2;
      },
    });
    expect(sendMessage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(sendMessage.mock.calls.length).toBeLessThan(3);
  });

  it('sendPlainReadingChunksToChat respects shouldContinue', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const telegram = { sendMessage } as never;
    await sendPlainReadingChunksToChat(telegram, 1, 'короткий текст', 10, {
      shouldContinue: () => false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
