/**
 * Потоковый черновик ответа (Bot API 9.5+ `sendMessageDraft`): пока ИИ пишет толкование,
 * пользователь видит набор текста. Черновик временный (~30 с) и исчезает, когда бот
 * отправляет любое сообщение; итоговое сообщение доставляет обычный код расклада.
 */

import type { Telegraf } from 'telegraf';
import { DEEP_SUMMARY_MARKER } from './deepReading/constants.js';
import { opsEvent } from './opsLog.js';
import { formatReadingForTelegram, prepareReadingPlain } from './readingTelegramHtml.js';
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
/** Черновик живёт ~30 с: подновляем после 20 с тишины, проверяем раз в 5 с. */
const HEARTBEAT_MS = 20_000;
const HEARTBEAT_CHECK_MS = 5000;
/** Сколько `stop()` ждёт отправку в полёте, прежде чем отпустить доставку итога. */
const STOP_WAIT_MS = 3000;
const MAX_TRANSIENT_FAILURES = 3;
const DEFAULT_RETRY_AFTER_SEC = 3;
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

type DraftPreview = { html: string; plain: string };

/** Черновик в той же вёрстке, что итог; длинный текст обрезается слева (виден пишущийся конец). */
function draftPreview(raw: string, mode: DraftMode): DraftPreview | undefined {
  let plain = prepareReadingPlain(mode === 'triplet' ? cutServiceSummary(raw) : raw).trim();
  if (plain.length === 0) return undefined;
  if (plain.length > PREVIEW_PLAIN_TAIL) {
    plain = `…${plain.slice(-PREVIEW_PLAIN_TAIL)}`;
  }
  for (;;) {
    const html = formatReadingForTelegram(plain);
    if (html.length <= TG_TEXT_MAX || plain.length <= 200) return { html, plain };
    plain = `…${plain.slice(Math.floor(plain.length / 4))}`;
  }
}

/** HTML для черновика. `undefined` — текста ещё нет (Telegram покажет «Thinking…»). */
export function draftPreviewHtml(raw: string, mode: DraftMode): string | undefined {
  return draftPreview(raw, mode)?.html;
}

/** Один вызов `sendMessageDraft`; `text` `undefined` — плейсхолдер «Thinking…». */
export type DraftSend = (text: string | undefined, parseMode: 'HTML' | undefined) => Promise<void>;

export type DraftStreamerOptions = {
  send: DraftSend;
  mode: DraftMode;
  minIntervalMs?: number;
  heartbeatMs?: number;
  stopWaitMs?: number;
  /** Каждая ошибка отправки (для логов); пауза или отключение решаются внутри. */
  onError?: (e: unknown) => void;
};

/**
 * Склеивает быстрые обновления текста в редкие вызовы `send` (не чаще `minIntervalMs`
 * от начала прошлого вызова) и подновляет черновик, пока модель «думает».
 * Ошибки: 429 — пауза на `retry_after`; 400 — один раз переход на текст без HTML;
 * сеть/5xx — до трёх подряд; прочие 4xx — отключение до конца задачи.
 */
export class DraftStreamer {
  private readonly minIntervalMs: number;
  private readonly heartbeatMs: number;
  private readonly stopWaitMs: number;
  private latest: DraftPreview | undefined;
  private lastSentAt = 0;
  private pausedUntil = 0;
  private dirty = false;
  private inFlight: Promise<void> | undefined;
  private stopped = false;
  private disabled = false;
  private plainText = false;
  private transientFailures = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly opts: DraftStreamerOptions) {
    this.minIntervalMs = opts.minIntervalMs ?? MIN_INTERVAL_MS;
    this.heartbeatMs = opts.heartbeatMs ?? HEARTBEAT_MS;
    this.stopWaitMs = opts.stopWaitMs ?? STOP_WAIT_MS;
  }

  /** Показывает «Thinking…» и запускает подновление черновика. */
  start(): void {
    this.dirty = true;
    this.latest = undefined;
    void this.flush();
    this.heartbeat = setInterval(
      () => {
        if (this.stopped || this.disabled || this.inFlight) return;
        if (Date.now() - this.lastSentAt < this.heartbeatMs) return;
        this.dirty = true;
        this.schedule();
      },
      Math.min(HEARTBEAT_CHECK_MS, this.heartbeatMs),
    );
  }

  push(raw: string): void {
    if (this.stopped || this.disabled) return;
    const preview = draftPreview(raw, this.opts.mode);
    if (preview === undefined || preview.html === this.latest?.html) return;
    this.latest = preview;
    this.dirty = true;
    this.schedule();
  }

  /**
   * Больше никаких отправок. Ждёт вызов в полёте (не дольше `stopWaitMs`), чтобы запоздалый
   * черновик не появился после итогового сообщения.
   */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.timer = undefined;
    this.heartbeat = undefined;
    const pending = this.inFlight;
    if (!pending) return;
    let waitTimer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      pending,
      new Promise<void>((resolve) => {
        waitTimer = setTimeout(resolve, this.stopWaitMs);
      }),
    ]);
    clearTimeout(waitTimer);
  }

  private schedule(): void {
    if (this.stopped || this.disabled || this.inFlight || this.timer !== undefined) return;
    const now = Date.now();
    const wait = Math.max(0, this.lastSentAt + this.minIntervalMs - now, this.pausedUntil - now);
    if (wait === 0) {
      void this.flush();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, wait);
  }

  private flush(): Promise<void> {
    if (!this.dirty || this.stopped || this.disabled || this.inFlight) return Promise.resolve();
    this.dirty = false;
    this.lastSentAt = Date.now();
    const run = this.sendPreview(this.latest).finally(() => {
      this.inFlight = undefined;
      if (this.dirty) this.schedule();
    });
    this.inFlight = run;
    return run;
  }

  private async sendPreview(preview: DraftPreview | undefined): Promise<void> {
    try {
      if (preview === undefined) {
        await this.opts.send(undefined, undefined);
      } else if (this.plainText) {
        await this.opts.send(preview.plain, undefined);
      } else {
        await this.opts.send(preview.html, 'HTML');
      }
      this.transientFailures = 0;
    } catch (e) {
      this.onSendError(e);
    }
  }

  private onSendError(e: unknown): void {
    this.opts.onError?.(e);
    const err = e instanceof TelegramRawApiError ? e : undefined;
    const code = err?.code;
    if (code === 429) {
      this.pausedUntil = Date.now() + (err?.retryAfterSec ?? DEFAULT_RETRY_AFTER_SEC) * 1000;
      this.dirty = true;
      return;
    }
    if (code === 400 && !this.plainText) {
      this.plainText = true;
      this.dirty = true;
      return;
    }
    if (code !== undefined && code >= 400 && code < 500) {
      this.disabled = true;
      return;
    }
    this.transientFailures += 1;
    if (this.transientFailures >= MAX_TRANSIENT_FAILURES) {
      this.disabled = true;
      return;
    }
    this.dirty = true;
  }
}

function newDraftId(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

/**
 * Потоковый черновик для личного чата или `undefined`, если стриминг выключен/недоступен.
 * «Метод не найден» (404) отключает стриминг до перезапуска процесса; прочие ошибки —
 * только этот черновик (см. {@link DraftStreamer}).
 */
export function createTelegramDraftStreamer(
  telegram: Telegraf['telegram'],
  chatId: number,
  mode: DraftMode,
): DraftStreamer | undefined {
  if (!isDraftStreamingActive()) return undefined;
  const draftId = newDraftId();
  let reported = false;
  return new DraftStreamer({
    mode,
    send: async (text, parseMode) => {
      await callTelegramRaw(telegram, 'sendMessageDraft', {
        chat_id: chatId,
        draft_id: draftId,
        text,
        parse_mode: parseMode,
      });
    },
    onError: (e) => {
      const code = e instanceof TelegramRawApiError ? e.code : undefined;
      if (code === 404) draftApiUnavailable = true;
      if (reported && code !== 404) return;
      reported = true;
      opsEvent('draft_stream_failed', { reason: code === undefined ? 'network' : code });
      console.warn('[draft_stream]', e instanceof Error ? e.message : e);
    },
  });
}
