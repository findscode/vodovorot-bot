import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRichReadingHtml,
  nonEmptyInlineMarkup,
  resetRichMessagesForTests,
  richMessagesEnabled,
  telegramHtmlToRichParagraphs,
  trySendRichReading,
} from './richReading.js';

const telegram = { token: 'T', options: { apiRoot: 'https://api.example.test' } };
const input = {
  photoPng: Buffer.from([1]),
  headHtml: '<b>Расклад</b>\nПрошлое: Карта',
  readingRaw: 'Первый абзац.\n\nВторой абзац.',
  footerHtml: 'Подсказка',
};

function okFetch(): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: {} })));
}

afterEach(() => {
  resetRichMessagesForTests();
  vi.unstubAllEnvs();
});

describe('richMessagesEnabled', () => {
  it('is on by default and off for kill-switch values', () => {
    expect(richMessagesEnabled({})).toBe(true);
    for (const v of ['0', 'false', 'OFF', 'no']) {
      expect(richMessagesEnabled({ RICH_MESSAGES_ENABLED: v })).toBe(false);
    }
  });
});

describe('telegramHtmlToRichParagraphs', () => {
  it('splits blocks into paragraphs and keeps single breaks', () => {
    expect(telegramHtmlToRichParagraphs('a\nb\n\n\nc')).toBe('<p>a<br>b</p>\n<p>c</p>');
    expect(telegramHtmlToRichParagraphs('  ')).toBe('');
  });
});

describe('buildRichReadingHtml', () => {
  it('puts photo first, then head, reading and footer', () => {
    const html = buildRichReadingHtml(input);
    expect(html.startsWith('<img src="tg://photo?id=cards"/>')).toBe(true);
    expect(html.indexOf('Расклад')).toBeLessThan(html.indexOf('Первый абзац'));
    expect(html.indexOf('Второй абзац')).toBeLessThan(html.indexOf('Подсказка'));
  });

  it('makes each section a paragraph with the label on the first line', () => {
    const html = buildRichReadingHtml({
      ...input,
      readingRaw: 'Слева\nОбраз.\nВывод\nГлавное.\nЗакрытие.',
    });
    expect(html).toContain(
      '<p><b>Слева</b><br>Образ.</p>\n<p><b>Вывод</b><br>Главное.</p>\n<p>Закрытие.</p>',
    );
  });
});

describe('nonEmptyInlineMarkup', () => {
  it('returns undefined for empty keyboard', () => {
    expect(nonEmptyInlineMarkup(undefined)).toBeUndefined();
    expect(nonEmptyInlineMarkup({ reply_markup: { inline_keyboard: [] } })).toBeUndefined();
  });
  it('returns the keyboard when rows exist', () => {
    expect(nonEmptyInlineMarkup({ reply_markup: { inline_keyboard: [[{}]] } })).toEqual({
      inline_keyboard: [[{}]],
    });
  });
});

describe('trySendRichReading', () => {
  it('sends sendRichMessage and returns true', async () => {
    const fetchImpl = okFetch();
    const ok = await trySendRichReading(
      telegram,
      9,
      input,
      'day',
      fetchImpl as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toContain('/sendRichMessage');
  });

  it('returns false when the kill switch is set', async () => {
    vi.stubEnv('RICH_MESSAGES_ENABLED', '0');
    const fetchImpl = okFetch();
    const ok = await trySendRichReading(
      telegram,
      9,
      input,
      'day',
      fetchImpl as unknown as typeof fetch,
    );
    expect(ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns false for too long text without calling the API', async () => {
    const fetchImpl = okFetch();
    const ok = await trySendRichReading(
      telegram,
      9,
      { ...input, readingRaw: 'я'.repeat(31_000) },
      'spread',
      fetchImpl as unknown as typeof fetch,
    );
    expect(ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back on API error and pauses after 404', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error_code: 404, description: 'nf' }), {
        status: 404,
      }),
    );
    expect(
      await trySendRichReading(telegram, 9, input, 'day', failing as unknown as typeof fetch),
    ).toBe(false);
    const next = okFetch();
    expect(
      await trySendRichReading(telegram, 9, input, 'day', next as unknown as typeof fetch),
    ).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });
});
