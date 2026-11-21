# Roadmap

**Версия продукта:** см. `package.json` и [CHANGELOG.md](../CHANGELOG.md). **Агентам:** [AGENTS.md](../AGENTS.md).

**Инварианты:** только **private**; HTML; **«ты»**; deep **in-memory**, TTL 24 ч; «На день» / ПНБ / шаг deep — **фото → поток → текст**; карты из **полной колоды** 78 (`deck.ts`) — [GLOSSARY §8](./GLOSSARY.md).

---

## В работе (4.x)

| ID    | Issue                                                       | Эпик                                                     | Волна  |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------- | ------ |
| v4-1  | [#53](https://github.com/findscode/vodovorot-bot/issues/53) | P1 — промпты: safety и тон                               | 4.1 ✅ |
| v4-2  | [#54](https://github.com/findscode/vodovorot-bot/issues/54) | P1 — уточнение вопроса (модель)                          | 4.1 ✅ |
| v4-6  | [#58](https://github.com/findscode/vodovorot-bot/issues/58) | P1 — fail-open при сбое clarity                          | 4.1 ✅ |
| v4-7  | [#59](https://github.com/findscode/vodovorot-bot/issues/59) | P1 — регрессия safety/disclaimer                         | 4.1 ✅ |
| v4-3  | [#55](https://github.com/findscode/vodovorot-bot/issues/55) | P2 — Mini App «Настройки» v1                             | 4.2 ✅ |
| v4-4  | [#56](https://github.com/findscode/vodovorot-bot/issues/56) | P2 — UX при потере deep/spread-сессии                    | 4.2 ✅ |
| v4-5  | [#57](https://github.com/findscode/vodovorot-bot/issues/57) | P2 — Mini App v2, один источник правды                   | 4.3 ✅ |
| v4-8  | [#60](https://github.com/findscode/vodovorot-bot/issues/60) | P2 — deep: укороченный финал на basic                    | 4.3 ✅ |
| v4-9  | [#61](https://github.com/findscode/vodovorot-bot/issues/61) | P2 ops — логи и счётчики                                 | 4.3 ✅ |
| v4-10 | [#62](https://github.com/findscode/vodovorot-bot/issues/62) | P2 ops — `/admin stats`                                  | 4.3 ✅ |
| v4-11 | _TBD_                                                       | P2 — Mini App hub: запуск раскладов                      | 4.4 ✅ |
| v4-12 | _TBD_                                                       | P1 — качество ИИ, доставка, толкователь                  | 4.5 ✅ |
| v4-13 | _TBD_                                                       | Оплата Бусти вместо промокодов; free/Premium под воронку | next   |

**Tier A «один фокус»** в intro — в scope [#53](https://github.com/findscode/vodovorot-bot/issues/53) (`tierDisplay.ts`), отдельный issue не нужен.

Milestone: [v4.x](https://github.com/findscode/vodovorot-bot/milestone/14). Backlog push: [v2.16.0](https://github.com/findscode/vodovorot-bot/milestone/12) — [DEPLOY](./DEPLOY.md).

Бренд, канал, Бусти, коммьюнити (superior вне кода): private-репо [`vodovorot-brand`](https://github.com/findscode/vodovorot-brand). Решения про продукт оттуда **обязаны** попадать сюда в ROADMAP / DEPLOY / GLOSSARY / CHANGELOG `[Unreleased]` (см. AGENTS.md § синхронизация).

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

## 4.5 — качество толкований, доставка и наблюдаемость

**Версия:** **4.5.0** (MINOR). **Статус:** ✅ в коде.

**Толкования**

- Явно показывать в подписи к картам случайного **толкователя** из старших арканов; его голос допустим в самом толковании.
- Сжать и усилить промпты: один источник правил языка/тона, точный каркас ответа, без дублирующих инструкций.
- **Вес — в выводе:** по отдельным картам 1–2 коротких предложения; ПНБ завершает метка **Итог**; шаг deep разбит на **Слева** / **В центре** / **Справа** и **Вывод** (раньше — один плотный абзац). → [BRAND-GUIDE §5–6.1](./BRAND-GUIDE.md)
- Актуализировать fallback бесплатных OpenRouter-моделей; учитывать `finish_reason`, повторять обрезанный ответ один раз.
- Проверять каркас «На день» и ПНБ; один repair-pass при нарушении формата.

**Доставка**

- **Фото и толкование раздельно** для «На день», ПНБ и **шага deep**: сначала коллаж/карта с подписью, затем поток толкования и финальные чанки. Rich Message не основной путь (helper в коде остаётся). Общий вывод deep — текст по частям.
- **Единая вёрстка разделов** (`normalizeReadingLayout`): метка и её текст соседними строками; перед следующей меткой, вторым абзацем и финальной фразой — ровно одна пустая строка (chunks и draft).
- **Вопрос сразу** после запуска ПНБ или deep, без «Начать»; кнопка остаётся.
- **Потоковый ответ:** `stream:true` у OpenRouter и черновик `sendMessageDraft` (Bot API 9.5) **после** фото; выключатель `DRAFT_STREAMING_ENABLED=0`. Telegraf 4.16 этих методов не знает — прямые вызовы в `telegramRawApi.ts`. Черновик не обгоняет итог (`stop` ждёт in-flight); 429/400 HTML обрабатываются локально.
- **Без сообщения «Толкование ещё готовится»:** вместо него «печатает…» и черновик.

**Стабильность и наблюдаемость**

- **Deep и ПНБ:** отдельные апдейты не блокируют друг друга (`detachedUpdates.ts`); лимит запросов к OpenRouter сдвигает старт, а не держит очередь; сбой доставки отделён от сбоя ИИ (`delivery_error` в `/admin stats`); deep сохраняет готовый шаг (`pendingReading`) для повтора без нового запроса к ИИ.
- **Бесшовный UX при сбоях:** сохранять spread/deep-сессию; retry того же шага без Menu; фото → поток → текст; soft `bot.catch` (только in-flight).
- `/admin stats` читаемый: русские секции, причины сбоев clarity, модели, latency, блок «Доставка».

**Тексты:** тон «между эзотерикой и точностью» — без инженерных слов в сообщениях бота ([BRAND-GUIDE §1](./BRAND-GUIDE.md)). Термин **ПНБ** — в [GLOSSARY](./GLOSSARY.md).

**Код:** `readingVoice.ts`, `prompts.ts`, `brandFormat.ts`, `openRouterChat.ts`, `opsLog.ts`, `adminStatsCopy.ts`, `richReading.ts`, `readingDraft.ts`, `telegramRawApi.ts`, `openRouterStream.ts`, `cardOfDayDelivery.ts`, `spreadDelivery.ts`, `deepReadingDelivery.ts`, `registerErrorHandler.ts`, `handlers/detachedUpdates.ts`, `openRouterRequestGate.ts`.

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
| **Рост и оплата**              | **Бусти вместо промокодов** — в работе (см. § ниже). Рефералы / Stars — по-прежнему не в фокусе.                                                                                                                                                                                                                                                         |

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

`accessTier.ts`, `tierDisplay.ts`; промо — `/promo`, `/admin promo` (**уходят** → Бусти, см. § ниже).

---

## Далее — оплата и доступы (Бусти)

**Статус:** в работе (решения зафиксированы в [`vodovorot-brand`](https://github.com/findscode/vodovorot-brand); код — ещё нет). **Issue:** TBD (v4-13).

### Решение

- Система **промокодов уходит**. Выдача Premium — через подписку **Бусти** ([boosty.to/vortextarot](https://boosty.to/vortextarot)).
- Тарифы: **«Полный доступ»** 20 BYN / **«Ближний круг»** 30 BYN (круг = то же + закрытый чат).
- На Бусти обязателен Telegram `@username`; по нему Premium в боте + заявка в чат круга.
- **Срок Premium v1:** +**31** день за каждый оплаченный месяц Бусти (`premium_until = max(now, current) + 31`). Позже — синхрон статуса подписки Бусти.
- Промокоды и кнопка `/promo` уходят **в том же релизе**, что живой Бусти. **`/admin grant`** оставляем (ops). Таблицу `promo_codes` можно не дропать сразу.
- Апгрейд тарифа Бусти 20→30 в том же периоде: чат без повторного +31.
- Перед новой схемой: **откат всех на free кроме админов** (тестовые Premium не сохраняем); объявление in-bot / «Что нового» + приглашение в канал. Ближайшим — точечный `/admin grant` (не массовый подарок).
- Выдача Premium после Бусти (v1): без жёсткого SLA на витрине; быстрее тем, кто пишет в ЛС; иначе после сверки `@`.
- Возврат/чарджбек: как отмена — доступ до конца уже выданного `premium_until`, не мгновенный срез.
- Free к промо: **«На день»** + ПНБ **1/сутки**; deep и лишний ПНБ — зона оплаты («Полный доступ»).
- Дисклеймер: новая универсальная формулировка в brand `disclaimer.md` → перенос в `DISCLAIMER_HELP`.
- Канал: https://t.me/VortexTarotChannel ; бот: `@VortexTarotBot`. Подпись к раскладу (редко, 1/7): нейтрально ссылка на канал.
- BotFather: в Description/About — бот + канал; Бусти не в About как главный CTA.

### Не в этом эпике (бренд/ops вне бота)

Тексты канала, витрина Бусти, модерация чата, **контент-фабрика / генератор постов** — `vodovorot-brand` (см. там `ROADMAP.md`, `artifacts/`). Здесь только доступы, лимиты, выдача Premium, тексты бота, BotFather.

Готовые формулировки к коду: `vodovorot-brand` → `artifacts/bot-facing-copy.md`, `disclaimer.md`.

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
