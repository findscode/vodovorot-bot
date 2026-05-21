import type { Telegraf } from 'telegraf';
import {
  AI_TEXT_UNAVAILABLE_MESSAGE,
  SPREAD_DONE_HINT,
  SPREAD_IMAGES_UNAVAILABLE_SUFFIX,
} from '../botCopy.js';
import { keyboardMainOrDayOnly } from '../botKeyboards.js';
import { completeChat } from '../ai.js';
import { cardImageExists } from '../cardAssets.js';
import { drawThreeUnique, drawVoiceArchetype, formatDrawnLine } from '../deck.js';
import { pastPresentFuturePrompt } from '../prompts.js';
import { TELEGRAM_HTML_PARSE, threeCardSpreadCaptionHtmlBounded } from '../readingTelegramHtml.js';
import { sendReadingChunksToChat } from '../readingChunksDelivery.js';
import { spreadCompositePhotoInput } from '../spreadComposite.js';
import { withTypingWhile } from '../typingIndicator.js';
import { answerCbQuerySafe, logHandlerError } from './botHelpers.js';

const TG_CAPTION_MAX = 1024;

export function registerSpreadHandlers(bot: Telegraf): void {
  bot.action('spread', async (ctx) => {
    await answerCbQuerySafe(ctx);
    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const cards = drawThreeUnique();
    const positions = ['Прошлое', 'Настоящее', 'Будущее'] as const;
    const lines = cards.map((d, i) => `${positions[i]}: ${formatDrawnLine(d)}`);
    const captionHtml = threeCardSpreadCaptionHtmlBounded(lines, TG_CAPTION_MAX);

    const allExist = cards.every((d) => cardImageExists(d.card.id));

    let faceMessageId: number;
    if (allExist) {
      const photo = await spreadCompositePhotoInput(cards);
      const faceMsg = await ctx.replyWithPhoto(photo, {
        caption: captionHtml,
        ...TELEGRAM_HTML_PARSE,
      });
      faceMessageId = faceMsg.message_id;
    } else {
      const faceMsg = await ctx.reply(
        `${captionHtml}\n\n${SPREAD_IMAGES_UNAVAILABLE_SUFFIX}`,
        TELEGRAM_HTML_PARSE,
      );
      faceMessageId = faceMsg.message_id;
    }

    const voice = drawVoiceArchetype();
    try {
      const text = await withTypingWhile(ctx, () =>
        completeChat(pastPresentFuturePrompt(cards, voice)),
      );
      await sendReadingChunksToChat(ctx.telegram, uid, text, faceMessageId, {
        lastChunkSuffix: SPREAD_DONE_HINT,
        lastChunkExtra: keyboardMainOrDayOnly(uid),
      });
    } catch (e) {
      logHandlerError('spread', e);
      await ctx.reply(AI_TEXT_UNAVAILABLE_MESSAGE, {
        ...keyboardMainOrDayOnly(uid),
        ...TELEGRAM_HTML_PARSE,
      });
    }
  });
}
