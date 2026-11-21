import { describe, expect, it, vi } from 'vitest';
import { createReadingProgressMux } from './readingProgressMux.js';

describe('createReadingProgressMux', () => {
  it('replays the latest text to a late subscriber', () => {
    const mux = createReadingProgressMux();
    mux.push('раз');
    mux.push('раз два');
    const onProgress = vi.fn();
    const unbind = mux.bind(onProgress);
    expect(onProgress).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith('раз два');
    mux.push('раз два три');
    expect(onProgress).toHaveBeenLastCalledWith('раз два три');
    unbind();
    mux.push('после');
    expect(onProgress).toHaveBeenCalledTimes(2);
  });
});
