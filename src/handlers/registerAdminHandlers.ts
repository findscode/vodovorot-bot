import type { Telegraf } from 'telegraf';
import { adminStatsHtml } from '../adminStatsCopy.js';
import {
  clearPremiumSync,
  createPromoCodeAutoSync,
  extendPremiumByDaysSync,
  getUserAdminInfoSync,
  listPromoCodesSync,
  userIsAdminSync,
} from '../db/usersRepo.js';
import { TELEGRAM_HTML_PARSE } from '../readingTelegramHtml.js';
import { deepMaxTripletsForTier, resolveAccessTier } from '../accessTier.js';
import { tierLabelWithEmojiForAdmin } from '../tierDisplay.js';
import { getActivePremiumUntilSync } from '../db/usersRepo.js';
import { PROMO_PREMIUM_DAYS } from '../promoConfig.js';
import { promoListMessageHtml } from '../promoAdminCopy.js';

const ADMIN_HELP_HTML = `<b>🍀 Админ</b>

<code>/admin</code> — эта справка
<code>/admin stats</code> — пользователи, Premium и ops за сутки
<code>/admin info ID</code> — карточка пользователя
<code>/admin grant ID ДНЕЙ</code> — выдать Premium вручную
<code>/admin revoke ID</code> — снять Premium
<code>/admin promo</code> — новый промокод (таро-имя, ${PROMO_PREMIUM_DAYS} дн.)
<code>/admin promo list</code> — статус кодов (свободен / кому активирован)`;

function parseAdminArgs(text: string): string[] {
  const rest = text.replace(/^\/admin(?:@\S+)?/i, '').trim();
  return rest ? rest.split(/\s+/) : [];
}

function parsePositiveInt(s: string | undefined): number | null {
  if (!s || !/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function registerAdminHandlers(bot: Telegraf): void {
  bot.command('admin', async (ctx) => {
    const fromId = ctx.from?.id;
    if (fromId === undefined || !userIsAdminSync(fromId)) {
      await ctx.reply('Команда только для администраторов бота.', TELEGRAM_HTML_PARSE);
      return;
    }

    const args = parseAdminArgs(ctx.message.text);
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      await ctx.reply(ADMIN_HELP_HTML, TELEGRAM_HTML_PARSE);
      return;
    }

    if (sub === 'stats') {
      await ctx.reply(adminStatsHtml(), TELEGRAM_HTML_PARSE);
      return;
    }

    if (sub === 'info') {
      const uid = parsePositiveInt(args[1]);
      if (uid === null) {
        await ctx.reply(
          'Укажи Telegram user id: <code>/admin info 123456789</code>',
          TELEGRAM_HTML_PARSE,
        );
        return;
      }
      const row = getUserAdminInfoSync(uid);
      if (!row) {
        await ctx.reply('Пользователь ещё не писал боту (нет строки в БД).', TELEGRAM_HTML_PARSE);
        return;
      }
      const tier = resolveAccessTier(uid);
      const prem = getActivePremiumUntilSync(uid);
      const premLine = prem
        ? `Premium до: <b>${prem.toISOString().slice(0, 10)}</b>`
        : 'Premium: нет';
      await ctx.reply(
        `<b>Пользователь</b> <code>${uid}</code>\nTier: <b>${tierLabelWithEmojiForAdmin(tier)}</b>\n${premLine}\nАдмин в БД: ${row.is_admin ? 'да' : 'нет'}\nРассылка дня: ${row.day_push_enabled ? 'вкл' : 'выкл'}\nDeep, макс. триплетов: ${deepMaxTripletsForTier(tier)}\nСоздан: ${row.created_at.slice(0, 10)}`,
        TELEGRAM_HTML_PARSE,
      );
      return;
    }

    if (sub === 'grant') {
      const uid = parsePositiveInt(args[1]);
      const days = parsePositiveInt(args[2]);
      if (uid === null || days === null || days > 3650) {
        await ctx.reply(
          'Формат: <code>/admin grant TELEGRAM_ID ДНЕЙ</code> (1–3650)',
          TELEGRAM_HTML_PARSE,
        );
        return;
      }
      extendPremiumByDaysSync(uid, days);
      await ctx.reply(
        `Premium для <code>${uid}</code> продлён на <b>${days}</b> дн. Tier: <b>${tierLabelWithEmojiForAdmin(resolveAccessTier(uid))}</b>.`,
        TELEGRAM_HTML_PARSE,
      );
      return;
    }

    if (sub === 'revoke') {
      const uid = parsePositiveInt(args[1]);
      if (uid === null) {
        await ctx.reply('Формат: <code>/admin revoke TELEGRAM_ID</code>', TELEGRAM_HTML_PARSE);
        return;
      }
      clearPremiumSync(uid);
      await ctx.reply(`Premium снят для <code>${uid}</code>.`, TELEGRAM_HTML_PARSE);
      return;
    }

    if (sub === 'promo') {
      const action = args[1]?.toLowerCase();
      if (action === 'list') {
        const rows = listPromoCodesSync(30);
        await ctx.reply(promoListMessageHtml(rows), TELEGRAM_HTML_PARSE);
        return;
      }
      const created = createPromoCodeAutoSync();
      if (!created.ok) {
        await ctx.reply(
          'Не удалось сгенерировать уникальный код — попробуй ещё раз через минуту.',
          TELEGRAM_HTML_PARSE,
        );
        return;
      }
      await ctx.reply(
        `<b>Промокод создан</b> — Premium <b>${PROMO_PREMIUM_DAYS}</b> дн., одноразовый.\nКод: <code>${created.code}</code>\n\nСледующее сообщение — <b>без форматирования</b>, его можно переслать участнику: строка копируется целиком.\nСтатус кодов: <code>/admin promo list</code>`,
        TELEGRAM_HTML_PARSE,
      );
      await ctx.reply(`/promo ${created.code}`);
      return;
    }

    await ctx.reply(ADMIN_HELP_HTML, TELEGRAM_HTML_PARSE);
  });
}
