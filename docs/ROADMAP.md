# Roadmap

**Версия продукта:** см. `package.json` и [CHANGELOG.md](../CHANGELOG.md). **Агентам:** [AGENTS.md](../AGENTS.md).

**Инварианты:** только **private**; HTML; **«ты»**; deep **in-memory**, TTL 24 ч; «На день» — **ИИ → фото → текст**; карты из **полной колоды** 78 (`deck.ts`) — [GLOSSARY §8](./GLOSSARY.md).

---

## В работе (4.x)

| ID    | Issue                                                       | Эпик                                   | Волна  |
| ----- | ----------------------------------------------------------- | -------------------------------------- | ------ |
| v4-1  | [#53](https://github.com/findscode/vodovorot-bot/issues/53) | P1 — промпты: safety и тон             | 4.1 ✅ |
| v4-2  | [#54](https://github.com/findscode/vodovorot-bot/issues/54) | P1 — уточнение вопроса (модель)        | 4.1 ✅ |
| v4-6  | [#58](https://github.com/findscode/vodovorot-bot/issues/58) | P1 — fail-open при сбое clarity        | 4.1 ✅ |
| v4-7  | [#59](https://github.com/findscode/vodovorot-bot/issues/59) | P1 — регрессия safety/disclaimer       | 4.1 ✅ |
| v4-3  | [#55](https://github.com/findscode/vodovorot-bot/issues/55) | P2 — Mini App «Настройки» v1           | 4.2 ✅ |
| v4-4  | [#56](https://github.com/findscode/vodovorot-bot/issues/56) | P2 — UX при потере deep/spread-сессии  | 4.2 ✅ |
| v4-5  | [#57](https://github.com/findscode/vodovorot-bot/issues/57) | P2 — Mini App v2, один источник правды | 4.3 ✅ |
| v4-8  | [#60](https://github.com/findscode/vodovorot-bot/issues/60) | P2 — deep: укороченный финал на basic  | 4.3 ✅ |
| v4-9  | [#61](https://github.com/findscode/vodovorot-bot/issues/61) | P2 ops — логи и счётчики               | 4.3 ✅ |
| v4-10 | [#62](https://github.com/findscode/vodovorot-bot/issues/62) | P2 ops — `/admin stats`                | 4.3 ✅ |
| v4-11 | _TBD_                                                       | P2 — Mini App hub: запуск раскладов    | 4.4 ✅ |
| v4-12 | _TBD_                                                       | P1 — качество ИИ и толкователь         | 4.5 🚧 |

**Tier A «один фокус»** в intro — в scope [#53](https://github.com/findscode/vodovorot-bot/issues/53) (`tierDisplay.ts`), отдельный issue не нужен.

Milestone: [v4.x](https://github.com/findscode/vodovorot-bot/milestone/14). Backlog push: [v2.16.0](https://github.com/findscode/vodovorot-bot/milestone/12) — [DEPLOY](./DEPLOY.md).

---

## 4.4 — Mini App hub (запуск раскладов)

**Версия:** **4.4.0** (MINOR). **Статус:** ✅ в коде.

### Цель

WebApp + Menu Button **«Меню»** — единая точка входа. **Убрать** повторяющуюся главную inline-сетку (день / spread / deep / промо) и **`/menu`**. Чат = гадание и служебные диалоги.

**Не в scope 4.4:** ввод вопроса в App; полный flow в App; перенос служебных inline (clarity, отмена, `deep_end`, push под «на день»).

### Поток

| Шаг           | Поведение                                                                       |
| ------------- | ------------------------------------------------------------------------------- |
| Выбор в App   | `sendData` → App закрывается → в чат **intro + «Начать»** (как callback сейчас) |
| «На день»     | Выдача в чат; push-контролы **под первым** толкованием                          |
| Spread / deep | Текст, clarity, финал — **в чате**                                              |
| Промокод      | **`/promo`** в чате                                                             |

### Чат vs App

- **Убрать:** `mainSpreadRows` (day, spread, deep, promo).
- **Оставить inline:** «Начать»/«Отмена», clarity, `deep_end`, push после «на день», пресеты push.
- **`/menu`:** удалить; **`/start`:** лаконичный текст + web_app «Открыть меню» + краткий обзор.
- Menu Button и title App: **«Меню»**.

### Лимиты в App

Остатки spread, grey out «На день» при занятом слоте, emoji tier 🌱/⭐️/🍀; labels из `SPREAD_BUTTON_LABEL` + `userHelpContent`.

### Mid-session

Новый расклад из App → **завершить** текущую spread/deep-сессию, **предупредить** в чат, затем intro нового.

### Техника (рекомендация)

- Handler `message.web_app_data`; DTO `/api/webapp/home` (или расширение settings).
- Whats new: первый `web_app_data` или `/start` после релиза.
- Prod: `WEBAPP_DOMAIN` обязателен; legacy inline не возвращаем.

### Smoke

App → intro в чат → «Начать» → результат; после расклада нет главной сетки; mid-session switch с предупреждением.

**Код:** `webapp/*`, `webappServer.ts`, `registerWebAppLaunchHandlers.ts`, `botKeyboards.ts`, `registerCommands.ts`, `botCopy.ts`, `bot.ts`, `BOTFATHER.md`.

---

## 4.5 — качество толкований и наблюдаемость

**Статус:** 🚧 в работе.

- Явно показывать в подписи к картам случайного **толкователя** из старших арканов; его голос допустим в самом толковании.
- Сжать и усилить промпты: один источник правил языка/тона, точный каркас ответа, без дублирующих инструкций.
- Актуализировать fallback бесплатных OpenRouter-моделей; учитывать `finish_reason`, повторять обрезанный ответ один раз.
- Проверять каркас «На день» и spread; один repair-pass при нарушении формата.
- Сделать `/admin stats` читаемым: русские секции, причины сбоев clarity, модели, latency и показатели качества.
- **Бесшовный UX при сбоях:** сохранять spread/deep-сессию; retry того же шага без Menu; ИИ → фото → текст; soft `bot.catch` (только in-flight).

**Код:** `readingVoice.ts`, `prompts.ts`, `brandFormat.ts`, `openRouterChat.ts`, `opsLog.ts`, `adminStatsCopy.ts`, delivery/caption раскладов, `spreadDelivery.ts`, `deepReadingDelivery.ts`, `registerErrorHandler.ts`.

---

## Ветка 4.x — решения (зафиксировано)

| Тема                           | Решение                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Уточнение вопроса**          | Один **служебный** вызов модели до карт; при необходимости — одно сообщение + «Уточнить» / «Оставить так» / «Отмена». Не чат с ИИ. Только первый вопрос spread/deep. **Fail-open** при ошибке ИИ — к раскладу без блокировки. → [#54](https://github.com/findscode/vodovorot-bot/issues/54), [#58](https://github.com/findscode/vodovorot-bot/issues/58) |
| **Промпты**                    | Без дат и «да/нет»; agency; «вероятности, не абсолют». Дисклеймер в `/help` ✅. Intro: «одна тема / один фокус». → [#53](https://github.com/findscode/vodovorot-bot/issues/53), [#59](https://github.com/findscode/vodovorot-bot/issues/59)                                                                                                              |
| **Толкователь и качество ИИ**  | Случайный старший аркан — видимый толкователь в подписи к картам; lean-промпты, format-gate и один retry обрезанного ответа. → §4.5                                                                                                                                                                                                                      |
| **Mini App**                   | **Гибрид 4.4:** App = **запуск** раскладов + настройки/справка (Menu «Меню»); чат = гадание и служебные inline. v1–v2 ✅ [#55](https://github.com/findscode/vodovorot-bot/issues/55), [#57](https://github.com/findscode/vodovorot-bot/issues/57); hub → §4.4                                                                                            |
| **Deep / spread после обрыва** | **Без** SQLite для сессий. Явные тексты в intro и при «висящем» вводе. После abort/ошибки старый in-flight delivery не пишет в новую сессию (session id + deep in-flight). При сбое ИИ сессия сохраняется для retry того же шага; `bot.catch` не рвёт сессию. → [#56](https://github.com/findscode/vodovorot-bot/issues/56), §4.5                        |
| **Deep на basic**              | До **3** триплетов; **укороченный** общий финал (2–3 абзаца). Premium — 7 + полный финал. → [#60](https://github.com/findscode/vodovorot-bot/issues/60)                                                                                                                                                                                                  |
| **Ops / аналитика**            | Структурированные логи (`question_clarity_skip`, `spread_limit_hit`, latency ИИ) → [#61](https://github.com/findscode/vodovorot-bot/issues/61); агрегаты в `/admin stats` → [#62](https://github.com/findscode/vodovorot-bot/issues/62)                                                                                                                  |
| **Рост и оплата**              | **Вне плана** (рефералы, Stars — только «на будущее»).                                                                                                                                                                                                                                                                                                   |

**Сверка P1:** [FOCUS-GROUP §2.1](./FOCUS-GUIDE.md#21-сложные-карты-и-баланс-тона).

---

## Ветка 3.0 — глубинная диагностика (выпущено)

Сессия до **7** триплетов + финал; вход — «Глубинная диагностика» (`deep`), **нет** `/deep`. Тон — [BRAND-GUIDE §5.1](./BRAND-GUIDE.md); данные — [PRIVACY §6](./PRIVACY.md).

|                     |                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Фазы**            | `intro` → `awaiting_first_question` → `in_chain` (+ `awaiting_clarification`, `awaiting_final_retry`) |
| **Basic / Premium** | 3 триплета + **укороченный финал** / 7 + полный финал ✅ **4.2.0**                                    |
| **Spread basic**    | до **3**/сутки («Начать» + вопрос) — **3.7.0**                                                        |
| **Код**             | `src/deepReading/*`, `registerDeepReadingHandlers.ts`, `middleware.ts`                                |

### Модель C — уровни доступа

| Уровень     | «На день» | Spread  | Deep                        |
| ----------- | --------- | ------- | --------------------------- |
| **basic**   | да        | 3/сутки | 3 триплета + короткий финал |
| **premium** | да        | ∞       | 7 + финал                   |
| **admin**   | да        | ∞       | как premium                 |

`accessTier.ts`, `tierDisplay.ts`; промо — `/promo`, `/admin promo`.

---

## Архив

История релизов — [CHANGELOG.md](../CHANGELOG.md). Milestones v1.4–v2.17 — [GitHub](https://github.com/findscode/vodovorot-bot/milestones).

| Ветка   | Суть                                                  |
| ------- | ----------------------------------------------------- |
| 2.x     | UX, push, deploy, надёжность дня (**2.16** — backlog) |
| 3.0–3.7 | deep, модель C, spread на basic, release notes        |

---

## Документы

[README.md](./README.md) · [DEPLOY.md](./DEPLOY.md) · [BRAND-GUIDE.md](./BRAND-GUIDE.md) · [GLOSSARY.md](./GLOSSARY.md)
