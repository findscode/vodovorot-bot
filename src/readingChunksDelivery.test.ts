import { describe, expect, it, vi } from 'vitest';
import { sendReadingChunksToChat } from './readingChunksDelivery.js';

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

  it('sends nothing when shouldContinue is false from the start', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    await sendReadingChunksToChat({ sendMessage } as never, 1, 'короткий текст', 10, {
      shouldContinue: () => false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('bolds deep triplet labels and keeps the text escaped', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    await sendReadingChunksToChat(
      { sendMessage } as never,
      1,
      'Слева\nОбраз <один>.\n\nВывод\nГлавное.',
      10,
    );
    const html = sendMessage.mock.calls[0]![1] as string;
    expect(html).toContain('<b>Слева</b>');
    expect(html).toContain('<b>Вывод</b>');
    expect(html).toContain('&lt;один&gt;');
  });

  it('separates sections and the suffix with one empty line', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    await sendReadingChunksToChat(
      { sendMessage } as never,
      1,
      'Общая картина\nСуть.\nИтог\nГлавное.\nЗакрытие.',
      10,
      { lastChunkSuffix: 'Хвост' },
    );
    expect(sendMessage.mock.calls[0]![1]).toBe(
      '<b>Общая картина</b>\nСуть.\n\n<b>Итог</b>\nГлавное.\n\nЗакрытие.\n\nХвост',
    );
  });
});
