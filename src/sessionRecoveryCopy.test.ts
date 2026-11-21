import { describe, expect, it } from 'vitest';
import {
  inactiveSessionTextMessageHtml,
  staleSessionButtonMessageHtml,
} from './sessionRecoveryCopy.js';

describe('sessionRecoveryCopy', () => {
  it('stale callback points to Menu', () => {
    expect(staleSessionButtonMessageHtml()).toContain('уже не работает');
    expect(staleSessionButtonMessageHtml()).toContain('Меню');
  });

  it('text without active session explains how to restart', () => {
    expect(inactiveSessionTextMessageHtml()).toContain('нет открытого гадания');
    expect(inactiveSessionTextMessageHtml()).toContain('Меню');
  });
});
