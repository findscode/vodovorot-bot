import { describe, expect, it } from 'vitest';
import { promoListMessageHtml } from './promoAdminCopy.js';

describe('promoListMessageHtml', () => {
  it('formats free and redeemed rows', () => {
    const html = promoListMessageHtml([
      { code: 'STAR-LANTERN', premium_days: 31, redeemed_at: null, redeemed_by_user_id: null },
      {
        code: 'FOOL-OMEN',
        premium_days: 31,
        redeemed_at: '2026-05-01T12:00:00.000Z',
        redeemed_by_user_id: 4242,
      },
    ]);
    expect(html).toContain('STAR-LANTERN');
    expect(html).toContain('свободен');
    expect(html).toContain('FOOL-OMEN');
    expect(html).toContain('активирован');
    expect(html).toContain('4242');
  });

  it('handles empty list', () => {
    expect(promoListMessageHtml([])).toContain('/admin promo');
  });
});
