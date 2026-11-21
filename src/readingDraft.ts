/**
 * Потоковый черновик ответа (Bot API 9.5+ `sendMessageDraft`): пока ИИ пишет толкование,
 * пользователь видит набор текста. Черновик временный (~30 с); итоговое сообщение
 * доставляет обычный код расклада.
 */

import type { Telegraf } from 'telegraf';
import { DEEP_SUMMARY_MARKER } from './deepReading/constants.js';
import { opsEvent } from './opsLog.js';
import { formatReadingForTelegram, stripModelFormatArtifacts } from './readingTelegramHtml.js';
import { callTelegramRaw, TelegramRawApiError } from './telegramRawApi.js';

/** Сырой текст модели «на данный момент». */
export type ReadingProgress = (partialRawText: string) => void;

/**
 * `reading` — метки разделов жирным (день, spread, финал deep);
 * `triplet` — то же, но без служебного «РЕЗЮМЕ:» (шаг deep).
 */
export type DraftMode = 'reading' | 'triplet';

/** Запуск ИИ-задачи с показом прогресса; для рассылки по подписке — без черновика. */
export type AiRunner = (
  mode: DraftMode,
  task: (onProgress: ReadingProgress) => Promise<string>,
) => Promise<string>;

export const noopProgress: ReadingProgress = () => {};

const TG_TEXT_MAX = 4096;
const PREVIEW_PLAIN_TAIL = 3500;
const MIN_INTERVAL_MS = 1000;
const HEARTBEAT_MS = 8000;
const SUMMARY_MARKER_TEXT = 'РЕЗЮМЕ:';

let draftApiUnavailable = false;

/** Выключатель: `DRAFT_STREAMING_ENABLED=0` (также false / off / no). */
export function draftStreamingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.DRAFT_STREAMING_ENABLED?.trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

export function isDraftStreamingActive(): boolean {
  return draftStreamingEnabled() && !draftApiUnavailable;
}

export function resetDraftStreamingForTests(): void {
  draftApiUnavailable = false;
}

function cutServiceSummary(raw: string): string {
  const match = raw.match(DEEP_SUMMARY_MARKER);
  let text = match?.index !== undefined ? raw.slice(0, match.index) : raw;
  // Модель могла успеть написать только начало «РЕЗЮМЕ:» — не показываем огрызок.
  const lines = text.split('\n');
  const last = lines.at(-1)?.trim().toUpperCase() ?? '';
  if (last.length > 0 && SUMMARY_MARKER_TEXT.startsWith(last)) {
    lines.pop();
    text = lines.join('\n');
  }
  return text;
}

/**
 * HTML для черновика. `undefined` — текста ещё нет (Telegram покажет «Thinking…»).
 * Длинный текст обрезается слева: виден конец, который пишется сейчас.
 */
export function draftPreviewHtml(raw: string, mode: DraftMode): string | undefined {
  let plain = stripModelFormatArtifacts(mode === 'triplet' ? cutServiceSummary(raw) : raw).trim();
  if (plain.length === 0) return undefined;
  if (plain.length > PREVIEW_PLAIN_TAIL) {
    plain = `…${plain.slice(-PREVIEW_PLAIN_TAIL)}`;
  }
  for (;;) {
    const html = formatReadingForTelegram(plain);
    if (html.length <= TG_TEXT_MAX || plain.length <= 200) return html.slice(0, TG_TEXT_MAX);
    plain = `…${plain.slice(Math.floor(plain.length / 4))}`;
  }
}

export type DraftStreamerOptions = {
  /** Один вызов `sendMessageDraft`; `undefined` — плейсхолдер «Thinking…». */
  send: (htmlText: string | undefined) => Promise<void>;
  mode: DraftMode;
  minIntervalMs?: number;
  heartbeatMs?: number;
  /** Ошибка отправки: поток отключается до конца задачи. */
  onError?: (e: unknown) => void;
};

/**
 * Склеивает быстрые обновления текста в редкие вызовы `send` (не чаще `minIntervalMs`)
 * и подновляет черновик, пока модель «думает» (он живёт ~30 с).
 */
export class DraftStreamer {
  private readonly minIntervalMs: number;
  private readonly heartbeatMs: number;
  private latest: string | undefined;
  private lastSent: string | undefined;
  private lastSentAt = 0;
  private dirty = false;
  private inFlight = false;
  private stopped = false;
  private disabled = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly opts: DraftStreamerOptions) {
    this.minIntervalMs = opts.minIntervalMs ?? MIN_INTERVAL_MS;
    this.heartbeatMs = opts.heartbeatMs ?? HEARTBEAT_MS;
  }

  /** Показывает «Thinking…» и запускает подновление черновика. */
  start(): void {
    this.dirty = true;
    this.latest = undefined;
    void this.flush();
    this.heartbeat = setInterval(() => {
      if (this.stopped || this.disabled || this.inFlight) return;
      if (Date.now() - this.lastSentAt < this.heartbeatMs - 100) return;
      this.dirty = true;
      void this.flush();
    }, this.heartbeatMs);
  }

  push(raw: string): void {
    if (this.stopped || this.disabled) return;
    const html = draftPreviewHtml(raw, this.opts.mode);
    if (html === undefined || html === this.lastSent || html === this.latest) return;
    this.latest = html;
    this.dirty = true;
    this.schedule();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.timer = undefined;
    this.heartbeat = undefined;
  }

  private schedule(): void {
    if (this.inFlight || this.timer !== undefined) return;
    const wait = Math.max(0, this.lastSentAt + this.minIntervalMs - Date.now());
    if (wait === 0) {
      void this.flush();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, wait);
  }

  private async flush(): Promise<void> {
    if (!this.dirty || this.stopped || this.disabled || this.inFlight) return;
    this.inFlight = true;
    this.dirty = false;
    const text = this.latest;
    try {
      await this.opts.send(text);
      this.lastSent = text;
    } catch (e) {
      this.disabled = true;
      this.opts.onError?.(e);
    } finally {
      this.inFlight = false;
      this.lastSentAt = Date.now();
      if (this.dirty && !this.stopped && !this.disabled) this.schedule();
    }
  }
}

function newDraftId(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

/**
 * Потоковый черновик для личного чата или `undefined`, если стриминг выключен/недоступен.
 * «Метод не найден» (404) отключает стриминг до перезапуска процесса.
 */
export function createTelegramDraftStreamer(
  telegram: Telegraf['telegram'],
  chatId: number,
  mode: DraftMode,
): DraftStreamer | undefined {
  if (!isDraftStreamingActive()) return undefined;
  const draftId = newDraftId();
  return new DraftStreamer({
    mode,
    send: async (text) => {
      await callTelegramRaw(telegram, 'sendMessageDraft', {
        chat_id: chatId,
        draft_id: draftId,
        text,
        parse_mode: text === undefined ? undefined : 'HTML',
      });
    },
    onError: (e) => {
      const code = e instanceof TelegramRawApiError ? e.code : undefined;
      if (code === 404) draftApiUnavailable = true;
      opsEvent('draft_stream_failed', { reason: code === undefined ? 'network' : code });
      console.warn('[draft_stream]', e instanceof Error ? e.message : e);
    },
  });
}
