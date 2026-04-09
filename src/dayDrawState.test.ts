import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tryConsumeDayDrawSlot } from './dayDrawState.js';

describe('dayDrawState', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vodovorot-day-'));
    process.env.DAY_DRAW_STATE_PATH = join(dir, 'state.json');
  });

  afterEach(async () => {
    delete process.env.DAY_DRAW_STATE_PATH;
    await rm(dir, { recursive: true, force: true });
  });

  it('allows only one slot per user per UTC calendar day', async () => {
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(false);
  });

  it('isolates users on the same day', async () => {
    expect(await tryConsumeDayDrawSlot(1, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(2, '2026-04-10')).toBe(true);
  });

  it('allows again on the next UTC day', async () => {
    expect(await tryConsumeDayDrawSlot(3, '2026-04-10')).toBe(true);
    expect(await tryConsumeDayDrawSlot(3, '2026-04-11')).toBe(true);
  });
});
