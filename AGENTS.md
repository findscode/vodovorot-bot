# AGENTS.md — навигация по репозиторию

Краткий ориентир для **Cursor-агентов** и разработчиков. Человекочитаемые детали — в `docs/`; здесь только «куда смотреть» и «куда писать».

**Версия:** `package.json` → сейчас **3.7.1**. История — [CHANGELOG.md](CHANGELOG.md). Запуск фокус-группы — [docs/FOCUS-GROUP.md](docs/FOCUS-GROUP.md).

## Правила Cursor (`.cursor/rules/`)

Краткие guardrails; полная карта — в этом файле и `docs/`. **alwaysApply:** `core.mdc`, `documentation.mdc`, `scripts-cleanup.mdc`. **По открытым файлам:** `bot-copy.mdc`, `deep-reading.mdc`, `card-flows.mdc`, `ai-prompts.mdc`, `testing.mdc`, `release-notes.mdc`.

---

## Куда нести изменения (без новых `*-PLAN.md`)

| Задача                                  | Документ                                          | Код (типично)                                                                      |
| --------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Продукт, поток, визуал, ограничения 3.x | [docs/ROADMAP.md](docs/ROADMAP.md) §3.0           | `src/deepReading/`, `src/handlers/`                                                |
| Тон, «ты», строки UI, emoji tiers       | [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md) §1, §4 | `src/botCopy.ts`, `src/spreadLabels.ts`, `src/statusCopy.ts`, `src/tierDisplay.ts` |
| Термины ↔ код                           | [docs/GLOSSARY.md](docs/GLOSSARY.md)              | по смыслу                                                                          |
| Формат толкований ИИ                    | [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md) §4–5   | `src/brandFormat.ts`, `src/prompts.ts`                                             |
| Подписи к фото                          | BRAND-GUIDE §3                                    | `src/readingTelegramHtml.ts`                                                       |
| Релиз                                   | [CHANGELOG.md](CHANGELOG.md) + `package.json`     | SemVer — [CONTRIBUTING.md](CONTRIBUTING.md)                                        |
| In-bot «Что нового»                     | [CHANGELOG.md](CHANGELOG.md) § релиз              | `src/releaseNotes.ts`, `src/releaseNotesDelivery.ts`, `users.last_seen_release`    |
| Деплой, env, ops                        | [docs/DEPLOY.md](docs/DEPLOY.md)                  | Docker, workflow                                                                   |
| Фокус-группа                            | [docs/FOCUS-GROUP.md](docs/FOCUS-GROUP.md)        | Smoke, промокоды, бриф                                                             |
| BotFather-тексты                        | [docs/BOTFATHER.md](docs/BOTFATHER.md)            | вне кода                                                                           |
| Индекс всех доков                       | [docs/README.md](docs/README.md)                  | —                                                                                  |

Временный чеклист — секция **«В работе»** в ROADMAP или пункты в CHANGELOG `[Unreleased]`, не отдельный plan-файл.

---

## Карта кода (проверять при правках)

| Область                                | Путь                                                                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Запуск бота                            | `src/bot.ts` → `registerHandlers()`                                                                                                            |
| In-bot «Что нового»                    | `src/releaseNotes.ts`, `registerReleaseNotesHandlers.ts`, `users.last_seen_release`                                                            |
| Команды, /help (вкл. бывший /status)   | `src/handlers/registerCommands.ts`, `src/statusCopy.ts`                                                                                        |
| «На день» + push                       | `registerDayHandlers.ts`, `cardOfDayDelivery.ts`, `dayPushScheduler.ts`, `dayPushTickLogic.ts`                                                 |
| Названия раскладов в текстах           | `src/spreadLabels.ts` (`SPREAD_BUTTON_LABEL`)                                                                                                  |
| Spread «Прошлое — настоящее — будущее» | `src/handlers/registerSpreadHandlers.ts`, `src/spreadComposite.ts`, `src/spreadSessionStore.ts` (фазы `intro` \| `awaiting_question`)          |
| Чёрный фон фото карт                   | `src/compositeBackground.ts` (полосы, коллаж, `cardPhotoInput`)                                                                                |
| Уровни доступа (модель C)              | `src/accessTier.ts`, `src/tierDisplay.ts`; промо — `promoCodeGenerator.ts`, `promoRedeemLimit.ts`; админ — `handlers/registerAdminHandlers.ts` |
| Глубинная диагностика                  | `src/deepReading/*`, `src/handlers/registerDeepReadingHandlers.ts`                                                                             |
| Блокировка во время deep               | `src/handlers/middleware.ts` (`registerDeepSessionMiddleware`)                                                                                 |
| Клавиатуры                             | `src/botKeyboards.ts`                                                                                                                          |
| Callback deep                          | `deep`, `deep_start`, `deep_cancel`, `deep_end` — `src/deepReading/constants.ts`                                                               |
| Фазы deep                              | `intro` \| `awaiting_first_question` \| `in_chain` — `sessionStore.ts`                                                                         |
| Коллаж 2–7 триплетов                   | `src/deepReading/compositeStack.ts` (наслоение `k × 12.5%` высоты карты)                                                                       |
| 1-й триплет = spread                   | `tripletStripFrame()` в `spreadComposite.ts`                                                                                                   |

---

## Инварианты (не нарушать без явного запроса)

- Только **личные** чаты (`private`).
- Deep-сессия **in-memory**, TTL 24 ч; рестарт процесса сбрасывает сессию.
- Нет `/deep`; вход — кнопка «Глубинная диагностика».
- «На день»: ИИ → фото → текст; лимит — календарные сутки в `DAY_DRAW_TIMEZONE`.
- Пользовательские тексты — HTML (`TELEGRAM_HTML_PARSE`), не MarkdownV2.

---

## Перед завершением задачи

```bash
npm run lint:fix && npm run format && npm run build && npm run test:coverage && npm run lint && npm run format:check
```

**TDD:** баг в логике → сначала `*.test.ts`, потом фикс ([CONTRIBUTING.md](CONTRIBUTING.md) § TDD). CI = `test:coverage` с порогами (`vitest.config.ts`).

При коммите **pre-commit** (Husky + lint-staged) сам чинит staged-файлы и гоняет `lint` + `format:check` как в CI — не полагайся только на ручной прогон.

Сверить затронутый раздел ROADMAP / BRAND-GUIDE с фактическим поведением в коде (особенно deep: фазы, middleware, коллаж).
