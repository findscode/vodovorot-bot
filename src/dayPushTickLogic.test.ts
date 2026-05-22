import { describe, expect, it, vi } from 'vitest';
import { decideDayPushTick } from './dayPushTickLogic.js';

const baseSub = {
  day_push_last_sent_date: null,
  day_push_timezone: 'Europe/Moscow',
  day_push_local_hhmm: '11:00',
};

function ctx(overrides: Partial<Parameters<typeof decideDayPushTick>[1]> = {}) {
  return {
    todayKey: '2026-05-22',
    slotUsedToday: false,
    isAtOrPastLocalHm: vi.fn(() => true),
    now: new Date('2026-05-22T08:00:00.000Z'),
    ...overrides,
  };
}

describe('decideDayPushTick', () => {
  it('deliver when due and push not sent today', () => {
    expect(decideDayPushTick(baseSub, ctx())).toEqual({ action: 'deliver' });
  });

  it('skip before local time', () => {
    const isAtOrPastLocalHm = vi.fn(() => false);
    expect(decideDayPushTick(baseSub, ctx({ isAtOrPastLocalHm }))).toEqual({
      action: 'skip',
      reason: 'before_local_time',
    });
  });

  it('skip when push already sent today', () => {
    expect(decideDayPushTick({ ...baseSub, day_push_last_sent_date: '2026-05-22' }, ctx())).toEqual(
      { action: 'skip', reason: 'already_sent_today' },
    );
  });

  it('skip push when day slot used manually (even if push not sent)', () => {
    expect(decideDayPushTick(baseSub, ctx({ slotUsedToday: true }))).toEqual({
      action: 'skip_slot_already_used',
    });
  });

  it('skip invalid local hhmm', () => {
    expect(decideDayPushTick({ ...baseSub, day_push_local_hhmm: '25:99' }, ctx())).toEqual({
      action: 'skip',
      reason: 'invalid_local_hhmm',
    });
  });

  it('skip invalid timezone', () => {
    expect(decideDayPushTick({ ...baseSub, day_push_timezone: 'Not/A_Zone' }, ctx())).toEqual({
      action: 'skip',
      reason: 'invalid_timezone',
    });
  });
});
