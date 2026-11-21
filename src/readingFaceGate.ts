/**
 * После sendPhoto клиент ещё догружает картинку; лёгкий sendMessageDraft часто
 * успевает отрисоваться раньше. Короткая пауза перед первым черновиком снижает
 * шанс «поток над картами».
 */

export const POST_FACE_DRAFT_DELAY_MS = 700;

export function settleAfterFaceBeforeDraft(ms: number = POST_FACE_DRAFT_DELAY_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
