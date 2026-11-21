import type { Context } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { detachUpdate } from './detachedUpdates.js';

const ctx = { from: { id: 1 } } as unknown as Context;

describe('detachUpdate', () => {
  it('does not wait for the handler chain', async () => {
    let release!: () => void;
    const next = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const onError = vi.fn();
    detachUpdate(ctx, next, onError);
    expect(next).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();
  });

  it('sends handler errors to the error handler', async () => {
    const err = new Error('boom');
    const onError = vi.fn();
    detachUpdate(ctx, () => Promise.reject(err), onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(err, ctx));
  });

  it('survives a failing error handler', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn().mockRejectedValue(new Error('again'));
    detachUpdate(ctx, () => Promise.reject(new Error('first')), onError);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });
});
