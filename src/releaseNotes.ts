import packageJson from '../package.json' with { type: 'json' };

/** Совпадает с `package.json` → `version` (источник правды для «видел релиз»). */
export const APP_RELEASE_VERSION = packageJson.version;

export const RELEASE_NOTES_OK_CALLBACK = 'release_notes_ok';

/** Колбэки главного меню: при первом действии после релиза показываем «Что нового». */
export const WHATS_NEW_TRIGGER_CALLBACKS = new Set(['day', 'spread', 'deep', 'promo_help']);

export function shouldShowWhatsNew(lastSeenRelease: string | null | undefined): boolean {
  return lastSeenRelease !== APP_RELEASE_VERSION;
}

/** Короткий текст для in-bot «Что нового» — переписывать при каждом заметном релизе (ровно 3 пункта). */
export function whatsNewHtml(): string {
  return `<b>Что нового</b>

• «На день» и «Прошлое — настоящее — будущее» теперь приходят одним сообщением — карты и толкование легко переслать.
• Вопрос можно написать сразу после запуска расклада — кнопка «Начать» не нужна.
• Толкования стали короче по картам, а главное — в выводе. В глубинной диагностике каждый шаг разбит по картам.

«Понятно» — и больше не напомню.`;
}
