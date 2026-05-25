# Roadmap

**Версия продукта:** см. `package.json` и [CHANGELOG.md](../CHANGELOG.md). **Агентам:** [AGENTS.md](../AGENTS.md).

**Инварианты:** только **private**; HTML; **«ты»**; deep **in-memory**, TTL 24 ч; «На день» — **ИИ → фото → текст**; карты из **полной колоды** 78 (`deck.ts`) — [GLOSSARY §8](./GLOSSARY.md).

---

## В работе (4.x)

| ID   | Issue                                                       | Эпик                                  |
| ---- | ----------------------------------------------------------- | ------------------------------------- |
| v4-1 | [#53](https://github.com/findscode/vodovorot-bot/issues/53) | P1 — промпты: safety и тон            |
| v4-2 | [#54](https://github.com/findscode/vodovorot-bot/issues/54) | P1 — уточнение вопроса (модель)       |
| v4-3 | [#55](https://github.com/findscode/vodovorot-bot/issues/55) | P2 — Mini App «Настройки»             |
| v4-4 | [#56](https://github.com/findscode/vodovorot-bot/issues/56) | P2 — UX при потере deep/spread-сессии |

Milestone: [v4.x](https://github.com/findscode/vodovorot-bot/milestone/14). Backlog push: [v2.16.0](https://github.com/findscode/vodovorot-bot/milestone/12) — [DEPLOY](./DEPLOY.md).

---

## Ветка 4.x — решения (зафиксировано)

| Тема                           | Решение                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Уточнение вопроса**          | Один **служебный** вызов модели до карт; при необходимости — одно сообщение + «Уточнить» / «Оставить так» / «Отмена». Не чат с ИИ. Только первый вопрос spread/deep. → [#54](https://github.com/findscode/vodovorot-bot/issues/54) |
| **Промпты**                    | Без дат и «да/нет»; agency; «вероятности, не абсолют». Дисклеймер в `/help` ✅. → [#53](https://github.com/findscode/vodovorot-bot/issues/53)                                                                                      |
| **Mini App**                   | **Гибрид:** гадание — кнопки в чате; настройки и справка — WebApp. Команды в чате пока дублируют App. → [#55](https://github.com/findscode/vodovorot-bot/issues/55)                                                                |
| **Deep / spread после обрыва** | **Без** SQLite для сессий. Явные тексты в intro и при «висящем» вводе. → [#56](https://github.com/findscode/vodovorot-bot/issues/56)                                                                                               |
| **Рост и оплата**              | **Вне плана** (рефералы, Stars — только «на будущее»).                                                                                                                                                                             |

**Сверка P1:** [FOCUS-GROUP §2.1](./FOCUS-GUIDE.md#21-сложные-карты-и-баланс-тона).

---

## Ветка 3.0 — глубинная диагностика (выпущено)

Сессия до **7** триплетов + финал; вход — «Глубинная диагностика» (`deep`), **нет** `/deep`. Тон — [BRAND-GUIDE §5.1](./BRAND-GUIDE.md); данные — [PRIVACY §6](./PRIVACY.md).

|                     |                                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| **Фазы**            | `intro` → `awaiting_first_question` → `in_chain`                       |
| **Basic / Premium** | 3 триплета без финала / 7 + финал                                      |
| **Spread basic**    | до **3**/сутки («Начать» + вопрос) — **3.7.0**                         |
| **Код**             | `src/deepReading/*`, `registerDeepReadingHandlers.ts`, `middleware.ts` |

### Модель C — уровни доступа

| Уровень     | «На день» | Spread  | Deep        |
| ----------- | --------- | ------- | ----------- |
| **basic**   | да        | 3/сутки | 3 триплета  |
| **premium** | да        | ∞       | 7 + финал   |
| **admin**   | да        | ∞       | как premium |

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
