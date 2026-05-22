# AGENTS.md — навигация по репозиторию

Краткий ориентир для **Cursor-агентов** и разработчиков. Человекочитаемые детали — в `docs/`; здесь только «куда смотреть» и «куда писать».

**Версия:** `package.json` → сейчас **3.4.0**. История — [CHANGELOG.md](CHANGELOG.md).

---

## Куда нести изменения (без новых `*-PLAN.md`)

| Задача                                  | Документ                                        | Код (типично)                               |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Продукт, поток, визуал, ограничения 3.x | [docs/ROADMAP.md](docs/ROADMAP.md) §3.0         | `src/deepReading/`, `src/handlers/`         |
| Тон, «ты», строки UI                    | [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md) §1   | `src/botCopy.ts`, `src/statusCopy.ts`       |
| Термины ↔ код                           | [docs/GLOSSARY.md](docs/GLOSSARY.md)            | по смыслу                                   |
| Формат толкований ИИ                    | [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md) §4–5 | `src/brandFormat.ts`, `src/prompts.ts`      |
| Подписи к фото                          | BRAND-GUIDE §3                                  | `src/readingTelegramHtml.ts`                |
| Релиз                                   | [CHANGELOG.md](CHANGELOG.md) + `package.json`   | SemVer — [CONTRIBUTING.md](CONTRIBUTING.md) |
| Деплой, env, ops                        | [docs/DEPLOY.md](docs/DEPLOY.md)                | Docker, workflow                            |
| BotFather-тексты                        | [docs/BOTFATHER.md](docs/BOTFATHER.md)          | вне кода                                    |
| Индекс всех доков                       | [docs/README.md](docs/README.md)                | —                                           |

Временный чеклист — секция **«В работе»** в ROADMAP или пункты в CHANGELOG `[Unreleased]`, не отдельный plan-файл.

---

## Карта кода (проверять при правках)

| Область                                | Путь                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Запуск бота                            | `src/bot.ts` → `registerHandlers()`                                              |
| Команды, /help, /status                | `src/handlers/registerCommands.ts`                                               |
| «На день»                              | `src/handlers/registerDayHandlers.ts`, `src/cardOfDayDelivery.ts`                |
| Spread «Прошлое — настоящее — будущее» | `src/handlers/registerSpreadHandlers.ts`, `src/spreadComposite.ts`               |
| Глубинная диагностика                  | `src/deepReading/*`, `src/handlers/registerDeepReadingHandlers.ts`               |
| Блокировка во время deep               | `src/handlers/middleware.ts` (`registerDeepSessionMiddleware`)                   |
| Клавиатуры                             | `src/botKeyboards.ts`                                                            |
| Callback deep                          | `deep`, `deep_start`, `deep_cancel`, `deep_end` — `src/deepReading/constants.ts` |
| Фазы deep                              | `intro` \| `awaiting_first_question` \| `in_chain` — `sessionStore.ts`           |
| Коллаж 2–7 триплетов                   | `src/deepReading/compositeStack.ts` (наслоение `k × 12.5%` высоты карты)         |
| 1-й триплет = spread                   | `tripletStripFrame()` в `spreadComposite.ts`                                     |

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
npm run build && npm test && npm run format:check
```

Сверить затронутый раздел ROADMAP / BRAND-GUIDE с фактическим поведением в коде (особенно deep: фазы, middleware, коллаж).
