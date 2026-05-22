import type { PromoCodeListRow } from './db/usersRepo.js';

function formatRedeemedAtRu(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

/** HTML-список промокодов для `/admin promo list`. */
export function promoListMessageHtml(rows: PromoCodeListRow[]): string {
  if (rows.length === 0) {
    return 'Промокодов в базе пока нет. Создай: <code>/admin promo</code>.';
  }

  const lines = rows.map((r) => {
    if (!r.redeemed_at) {
      return `<code>${r.code}</code> — <b>свободен</b> (${r.premium_days} дн.)`;
    }
    const who =
      r.redeemed_by_user_id !== null
        ? `user <code>${r.redeemed_by_user_id}</code>`
        : 'user неизвестен';
    return `<code>${r.code}</code> — <b>активирован</b> ${formatRedeemedAtRu(r.redeemed_at)}, ${who}`;
  });

  const free = rows.filter((r) => !r.redeemed_at).length;
  const used = rows.length - free;
  const header = `<b>Промокоды</b> (показано ${rows.length}: свободных ${free}, активированных ${used})`;
  return `${header}\n\n${lines.join('\n')}`;
}
