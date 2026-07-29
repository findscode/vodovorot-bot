import { describe, expect, it } from 'vitest';
import {
  inactiveSessionTextMessageHtml,
  staleSessionButtonMessageHtml,
} from './sessionRecoveryCopy.js';

describe('sessionRecoveryCopy', () => {
  it('stale callback points to Menu', () => {
    expect(staleSessionButtonMessageHtml()).toContain('устарела');
    expect(staleSessionButtonMessageHtml()).toContain('Меню');
  });

  it('text without active session explains how to restart', () => {
    expect(inactiveSessionTextMessageHtml()).toContain('не вижу активного гадания');
    expect(inactiveSessionTextMessageHtml()).toContain('Меню');
  });
});
