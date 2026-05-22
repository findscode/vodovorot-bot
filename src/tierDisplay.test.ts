import { describe, expect, it } from 'vitest';
import {
  activeTierStatusLineHtml,
  deepIntroHtml,
  labelPremiumButton,
  premiumFeaturePrefix,
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

  it('labelPremiumButton prefixes star', () => {
    expect(labelPremiumButton('Тест')).toBe(`${premiumFeaturePrefix()}Тест`);
  });
});
