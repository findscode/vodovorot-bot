import { describe, expect, it, vi } from 'vitest';
import { callTelegramRaw, TelegramRawApiError } from './telegramRawApi.js';

const target = { token: 'T0KEN', options: { apiRoot: 'https://api.example.test' } };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('callTelegramRaw', () => {
  it('sends JSON without files and returns result', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: { id: 7 } }));
    const result = await callTelegramRaw(
      target,
      'sendMessageDraft',
      { chat_id: 1, text: undefined },
      {},
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ id: 7 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/botT0KEN/sendMessageDraft');
    expect(JSON.parse(init.body as string)).toEqual({ chat_id: 1 });
  });

  it('sends multipart with JSON-encoded objects and skips empty values', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: true }));
    await callTelegramRaw(
      target,
      'sendRichMessage',
      { chat_id: 5, rich_message: { html: '<p>x</p>' }, reply_markup: undefined },
      {
        cards_png: { buffer: Buffer.from([1, 2, 3]), filename: 'c.png', contentType: 'image/png' },
      },
      fetchImpl as unknown as typeof fetch,
    );
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    const form = init.body as FormData;
    expect(form.get('chat_id')).toBe('5');
    expect(JSON.parse(form.get('rich_message') as string)).toEqual({ html: '<p>x</p>' });
    expect(form.has('reply_markup')).toBe(false);
    expect((form.get('cards_png') as File).name).toBe('c.png');
  });

  it('throws with error code when Bot API answers ok:false', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: false, error_code: 404, description: 'Not Found' }, 404),
      );
    const err = await callTelegramRaw(
      target,
      'x',
      {},
      {},
      fetchImpl as unknown as typeof fetch,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TelegramRawApiError);
    expect((err as TelegramRawApiError).code).toBe(404);
  });

  it('keeps retry_after from a 429 answer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error_code: 429,
          description: 'Too Many Requests',
          parameters: { retry_after: 3 },
        },
        429,
      ),
    );
    const err = await callTelegramRaw(
      target,
      'x',
      {},
      {},
      fetchImpl as unknown as typeof fetch,
    ).catch((e: unknown) => e);
    expect((err as TelegramRawApiError).code).toBe(429);
    expect((err as TelegramRawApiError).retryAfterSec).toBe(3);
  });

  it('throws without code on network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const err = await callTelegramRaw(
      target,
      'x',
      {},
      {},
      fetchImpl as unknown as typeof fetch,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TelegramRawApiError);
    expect((err as TelegramRawApiError).code).toBeUndefined();
  });

  it('throws when the response is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>', { status: 502 }));
    const err = await callTelegramRaw(
      target,
      'x',
      {},
      {},
      fetchImpl as unknown as typeof fetch,
    ).catch((e: unknown) => e);
    expect((err as TelegramRawApiError).code).toBe(502);
  });
});
