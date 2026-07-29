import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOpenRouterCircuit,
  isOpenRouterCircuitOpen,
  OPENROUTER_CIRCUIT_COOLDOWN_MS,
  resetOpenRouterCircuitForTests,
  tripOpenRouterCircuit,
} from './openRouterCircuitBreaker.js';

describe('openRouterCircuitBreaker', () => {
  afterEach(() => {
    resetOpenRouterCircuitForTests();
  });

  it('is closed by default', () => {
    expect(isOpenRouterCircuitOpen(1_000)).toBe(false);
  });

  it('opens for cooldown after trip', () => {
    const t0 = 10_000;
    tripOpenRouterCircuit(t0);
    expect(isOpenRouterCircuitOpen(t0)).toBe(true);
    expect(isOpenRouterCircuitOpen(t0 + OPENROUTER_CIRCUIT_COOLDOWN_MS - 1)).toBe(true);
    expect(isOpenRouterCircuitOpen(t0 + OPENROUTER_CIRCUIT_COOLDOWN_MS)).toBe(false);
  });

  it('clear closes immediately', () => {
    tripOpenRouterCircuit(50_000);
    clearOpenRouterCircuit();
    expect(isOpenRouterCircuitOpen(50_000)).toBe(false);
  });

  it('trip extends but does not shorten an open window', () => {
    tripOpenRouterCircuit(100_000);
    tripOpenRouterCircuit(100_000 + 60_000);
    expect(isOpenRouterCircuitOpen(100_000 + OPENROUTER_CIRCUIT_COOLDOWN_MS - 1)).toBe(true);
    expect(isOpenRouterCircuitOpen(100_000 + 60_000 + OPENROUTER_CIRCUIT_COOLDOWN_MS)).toBe(false);
  });
});
