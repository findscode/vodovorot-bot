import { describe, expect, it } from 'vitest';
import {
  quotedSpreadLabel,
  SPREAD_BUTTON_LABEL,
  spreadAccessOverviewHtml,
  spreadTitleLineHtml,
} from './spreadLabels.js';

describe('spreadLabels', () => {
  it('quotedSpreadLabel wraps button label', () => {
    expect(quotedSpreadLabel(SPREAD_BUTTON_LABEL.day)).toBe('«На день»');
  });

  it('spreadAccessOverviewHtml separates spreads with blank lines', () => {
    const html = spreadAccessOverviewHtml({ tier: 'basic', fullSpread: false });
    expect(html).toContain('«На день»');
    expect(html).toContain('«Глубинная диагностика»');
    expect(html).toContain('«Прошлое — настоящее — будущее»');
    expect(html.split('\n\n').length).toBeGreaterThanOrEqual(3);
  });

  it('deep title uses premium emoji when tier allows full deep', () => {
    expect(spreadTitleLineHtml('premium', 'deep')).toContain('⭐️');
    expect(spreadTitleLineHtml('premium', 'deep')).toContain('«Глубинная диагностика»');
  });
});
