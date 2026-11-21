import type { Telegraf } from 'telegraf';

/** Удаляет сообщение; ошибки (уже нет, нет прав) глотаем — чистка best-effort. */
export async function deleteMessageQuiet(
  telegram: Telegraf['telegram'],
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await telegram.deleteMessage(chatId, messageId);
  } catch {
    /* ignore */
  }
}

/** Удаляет набор служебных сообщений по id. */
export async function deleteMessagesQuiet(
  telegram: Telegraf['telegram'],
  chatId: number,
  messageIds: readonly number[],
): Promise<void> {
  if (messageIds.length === 0) return;
  await Promise.all(messageIds.map((id) => deleteMessageQuiet(telegram, chatId, id)));
}
