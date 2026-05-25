import { describe, expect, it } from 'vitest';
import {
  activeTierStatusLineHtml,
  deepIntroHtml,
  deepIntroReadyHtml,
  labelPremiumButton,
  premiumFeaturePrefix,
  spreadIntroReadyHtml,
  tierEmoji,
} from './tierDisplay.js';

describe('tierDisplay', () => {
  it('maps tiers to emoji', () => {
    expect(tierEmoji('premium')).toBe('⭐️');
    expect(tierEmoji('basic')).toBe('🌱');
    expect(tierEmoji('admin')).toBe('🍀');
  });

  it('premium intro marks heading with star', () => {
    expect(deepIntroHtml('premium')).toContain('⭐️');
    expect(deepIntroHtml('premium')).toContain('семи');
    expect(deepIntroHtml('basic')).not.toMatch(/<b>⭐️/);
    expect(deepIntroHtml('basic')).toContain('трёх');
  });

  it('status line uses clover for admin', () => {
    expect(activeTierStatusLineHtml('admin')).toContain('🍀');
    expect(activeTierStatusLineHtml('premium')).toContain('⭐️');
    expect(activeTierStatusLineHtml('premium')).toContain('Premium');
  });

  it('status line uses basic emoji not track wording', () => {
    const line = activeTierStatusLineHtml('basic');
    expect(line).toContain('🌱');
    expect(line).not.toContain('трек');
  });

  it('labelPremiumButton prefixes star', () => {
    expect(labelPremiumButton('Тест')).toBe(`${premiumFeaturePrefix()}Тест`);
  });

  it('ready intros mention one focus', () => {
    expect(spreadIntroReadyHtml('basic')).toContain('одна тема за раз');
    expect(deepIntroReadyHtml('premium')).toContain('одна тема за раз');
  });
});
