import type { ReadingLaunchContext } from './readingLaunchContext.js';
import { canUseSpread } from './accessResolve.js';
import { resolveAccessTier } from './accessTier.js';
import {
  CARD_DAY_AI_UNAVAILABLE_MESSAGE,
  CARD_DAY_DELIVERY_ERROR_MESSAGE,
  DAY_DEBOUNCE_MESSAGE,
  DAY_IN_FLIGHT_MESSAGE,
  dayLimitMessage,
  SPREAD_IN_FLIGHT_MESSAGE,
  spreadLimitMessage,
} from './botCopy.js';
import { keyboardSpreadIntro, keyboardDeepIntro } from './botKeyboards.js';
import { deliverCardOfDayReading } from './cardOfDayDelivery.js';
import { beginDeepSession } from './deepReading/deepReadingDelivery.js';
import { dayDrawCalendarDate, hasDayDrawSlotUsed } from './dayDrawState.js';
import { TELEGRAM_HTML_PARSE } from './readingTelegramHtml.js';
import { abortActiveReadingsSync } from './readingAbort.js';
import { opsEvent } from './opsLog.js';
import { beginSpreadSession } from './spreadSessionStore.js';
import { isSpreadInFlight } from './spreadInFlight.js';
import { deepIntroHtml, spreadIntroHtml } from './tierDisplay.js';
import { withTypingWhile } from './typingIndicator.js';
import { logHandlerError } from './handlers/botHelpers.js';
import type { WebAppLaunchAction } from './webapp/webappLaunchPayload.js';

const DAY_ACTION_DEBOUNCE_MS = 2500;
const dayLastTap = new Map<number, number>();
const dayInFlight = new Set<number>();

async function replyAbortNotice(ctx: ReadingLaunchContext, userId: number): Promise<void> {
  const { noticeHtml } = abortActiveReadingsSync(userId);
  if (noticeHtml) {
    await ctx.reply(noticeHtml, TELEGRAM_HTML_PARSE);
  }
}

export async function launchDayReading(ctx: ReadingLaunchContext, userId: number): Promise<void> {
  await replyAbortNotice(ctx, userId);

  if (dayInFlight.has(userId)) {
    await ctx.reply(DAY_IN_FLIGHT_MESSAGE, TELEGRAM_HTML_PARSE);
    return;
  }

  const at = new Date();
  const prevTap = dayLastTap.get(userId) ?? 0;
  if (at.getTime() - prevTap < DAY_ACTION_DEBOUNCE_MS) {
    await ctx.reply(DAY_DEBOUNCE_MESSAGE, TELEGRAM_HTML_PARSE);
    return;
  }
  dayLastTap.set(userId, at.getTime());

  const today = dayDrawCalendarDate(at);
  if (await hasDayDrawSlotUsed(userId, today)) {
    await ctx.reply(dayLimitMessage(), TELEGRAM_HTML_PARSE);
    return;
  }
  dayInFlight.add(userId);

  try {
    const result = await deliverCardOfDayReading(
      ctx.telegram,
      userId,
      (task) => withTypingWhile(ctx, task),
      { at },
    );
    if (result === 'ai_error') {
      await ctx.reply(CARD_DAY_AI_UNAVAILABLE_MESSAGE, TELEGRAM_HTML_PARSE);
    } else if (result === 'delivery_error') {
      await ctx.reply(CARD_DAY_DELIVERY_ERROR_MESSAGE, TELEGRAM_HTML_PARSE);
    } else if (result === 'slot_race') {
      await ctx.reply(dayLimitMessage(), TELEGRAM_HTML_PARSE);
    }
  } catch (e) {
    logHandlerError('day', e);
    await ctx.reply(CARD_DAY_DELIVERY_ERROR_MESSAGE, TELEGRAM_HTML_PARSE);
  } finally {
    dayInFlight.delete(userId);
  }
}

export async function launchSpreadIntro(ctx: ReadingLaunchContext, userId: number): Promise<void> {
  await replyAbortNotice(ctx, userId);

  if (!canUseSpread(userId)) {
    opsEvent('spread_limit_hit');
    await ctx.reply(spreadLimitMessage(), TELEGRAM_HTML_PARSE);
    return;
  }

  if (isSpreadInFlight(userId)) {
    await ctx.reply(SPREAD_IN_FLIGHT_MESSAGE, TELEGRAM_HTML_PARSE);
    return;
  }

  beginSpreadSession(userId, userId);
  const tier = resolveAccessTier(userId);
  await ctx.reply(spreadIntroHtml(tier), {
    ...keyboardSpreadIntro(),
    ...TELEGRAM_HTML_PARSE,
  });
}

export async function launchDeepIntro(ctx: ReadingLaunchContext, userId: number): Promise<void> {
  await replyAbortNotice(ctx, userId);

  beginDeepSession(userId, userId);
  opsEvent('deep_session_start');
  const tier = resolveAccessTier(userId);
  await ctx.reply(deepIntroHtml(tier), {
    ...keyboardDeepIntro(),
    ...TELEGRAM_HTML_PARSE,
  });
}

export async function launchReadingFromWebApp(
  ctx: ReadingLaunchContext,
  userId: number,
  action: WebAppLaunchAction,
): Promise<void> {
  switch (action) {
    case 'day':
      return launchDayReading(ctx, userId);
    case 'spread':
      return launchSpreadIntro(ctx, userId);
    case 'deep':
      return launchDeepIntro(ctx, userId);
  }
}
