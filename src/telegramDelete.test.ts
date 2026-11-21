import { describe, expect, it, vi } from 'vitest';
import { deleteMessageQuiet, deleteMessagesQuiet } from './telegramDelete.js';

describe('deleteMessageQuiet', () => {
  it('calls deleteMessage', async () => {
    const deleteMessage = vi.fn().mockResolvedValue(true);
    await deleteMessageQuiet({ deleteMessage } as never, 1, 42);
    expect(deleteMessage).toHaveBeenCalledWith(1, 42);
  });

  it('swallows errors', async () => {
    const deleteMessage = vi.fn().mockRejectedValue(new Error('gone'));
    await expect(deleteMessageQuiet({ deleteMessage } as never, 1, 42)).resolves.toBeUndefined();
  });
});

describe('deleteMessagesQuiet', () => {
  it('deletes each id', async () => {
    const deleteMessage = vi.fn().mockResolvedValue(true);
    await deleteMessagesQuiet({ deleteMessage } as never, 9, [1, 2]);
    expect(deleteMessage).toHaveBeenCalledTimes(2);
  });
});
