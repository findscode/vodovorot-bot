import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Telegraf } from 'telegraf';
import { MAX_PUSH_FAILURE_RETRIES_PER_DAY, resetPushFailuresForTests } from './dayPushRetry.js';

vi.mock('./db/usersRepo.js', () => ({
  markDayPushClosedForTodaySync: vi.fn(),
}));

import { markDayPushClosedForTodaySync } from './db/usersRepo.js';
import { applyDayPushDeliveryResult } from './dayPushApplyResult.js';

const markClosed = vi.mocked(markDayPushClosedForTodaySync);

function fakeBot(): Telegraf {
  return {
    telegram: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Telegraf;
}

describe('applyDayPushDeliveryResult', () => {
  beforeEach(() => {
    markClosed.mockReset();
  });

  afterEach(() => {
    resetPushFailuresForTests();
  });

  it('does not close push day before MAX ai failures', async () => {
    const bot = fakeBot();
    for (let i = 0; i < MAX_PUSH_FAILURE_RETRIES_PER_DAY - 1; i++) {
      await applyDayPushDeliveryResult({
        bot,
        userId: 11,
        todayKey: '2026-07-29',
        result: 'ai_error',
      });
    }
    expect(markClosed).not.toHaveBeenCalled();
  });

  it('closes push day after MAX ai failures so scheduler stops', async () => {
    const bot = fakeBot();
    for (let i = 0; i < MAX_PUSH_FAILURE_RETRIES_PER_DAY; i++) {
      await applyDayPushDeliveryResult({
        bot,
        userId: 12,
        todayKey: '2026-07-29',
        result: 'ai_error',
      });
    }
    expect(markClosed).toHaveBeenCalledTimes(1);
    expect(markClosed).toHaveBeenCalledWith(12, '2026-07-29');
  });

  it('closes push day after MAX delivery failures', async () => {
    const bot = fakeBot();
    for (let i = 0; i < MAX_PUSH_FAILURE_RETRIES_PER_DAY; i++) {
      await applyDayPushDeliveryResult({
        bot,
        userId: 13,
        todayKey: '2026-07-30',
        result: 'delivery_error',
      });
    }
    expect(markClosed).toHaveBeenCalledWith(13, '2026-07-30');
  });
});
