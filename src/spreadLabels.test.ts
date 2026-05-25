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
    const html = spreadAccessOverviewHtml({ tier: 'basic', unlimitedSpread: false });
    expect(html).toContain('«На день»');
    expect(html).toContain('«Глубинная диагностика»');
    expect(html).toContain('«Прошлое — настоящее — будущее»');
    expect(html).toContain('календарные сутки');
    expect(html.split('\n\n').length).toBeGreaterThanOrEqual(3);
  });

  it('spreadAccessOverviewHtml order matches main menu buttons (day, spread, deep)', () => {
    const html = spreadAccessOverviewHtml({ tier: 'basic', unlimitedSpread: false });
    const day = html.indexOf('«На день»');
    const spread = html.indexOf('«Прошлое — настоящее — будущее»');
    const deep = html.indexOf('«Глубинная диагностика»');
    expect(day).toBeLessThan(spread);
    expect(spread).toBeLessThan(deep);
  });

  it('deep title uses premium emoji when tier allows full deep', () => {
    expect(spreadTitleLineHtml('premium', 'deep')).toContain('⭐️');
    expect(spreadTitleLineHtml('premium', 'deep')).toContain('«Глубинная диагностика»');
  });
});
