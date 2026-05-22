# Документация Водоворот

**Текущая версия:** `package.json` и [CHANGELOG.md](../CHANGELOG.md).

## Для агентов и быстрый старт

| Документ                           | Зачем                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)          | **Главная навигация:** куда писать задачи, карта кода, инварианты, чеклист перед PR |
| [ROADMAP.md](./ROADMAP.md) §3.0    | Глубинная диагностика: поток, визуал, ограничения                                   |
| [BRAND-GUIDE.md](./BRAND-GUIDE.md) | Тон «ты», тексты UI, формат толкований                                              |

Не создавать новые `*-PLAN.md` без явной просьбы — см. [.cursor/rules/](../.cursor/rules/) (`core.mdc`, `documentation.mdc`).

## Оператор и деплой

| Документ                           | Зачем                                         |
| ---------------------------------- | --------------------------------------------- |
| [DEPLOY.md](./DEPLOY.md)           | Env, Docker, tiers, промокоды, push, логи     |
| [FOCUS-GROUP.md](./FOCUS-GROUP.md) | Чеклист запуска фокус-группы, smoke, бриф     |
| [BOTFATHER.md](./BOTFATHER.md)     | About / Description / Commands для @BotFather |
| [PRIVACY.md](./PRIVACY.md)         | Политика конфиденциальности (URL в BotFather) |

## Продукт и контент

| Документ                                 | Зачем                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| [BRAND-GUIDE.md](./BRAND-GUIDE.md)       | Тон бота и правила формата толкований                             |
| [GLOSSARY.md](./GLOSSARY.md)             | Термины для копирайта и промптов                                  |
| [ROADMAP.md](./ROADMAP.md)               | Релизы 2.x–3.x, эпики, milestones                                 |
| [UX-POLISH-PLAN.md](./UX-POLISH-PLAN.md) | **Архив** плана 3.2.0 (история; актуальное — ROADMAP + CHANGELOG) |

## Разработка

| Документ                              | Зачем                                  |
| ------------------------------------- | -------------------------------------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | SemVer, релизы, Conventional Commits   |
| [DEV-PROCESS.md](./DEV-PROCESS.md)    | Branch protection, CI, секреты Actions |
| [BRANCHING.md](./BRANCHING.md)        | `main`, `feature/*`, `fix/*`           |

## Код (ориентир)

| Путь                     | Роль                                         |
| ------------------------ | -------------------------------------------- |
| `src/bot.ts`             | Telegraf, `registerHandlers`, `bot.catch`    |
| `src/botCopy.ts`         | Все системные тексты пользователю            |
| `src/tierDisplay.ts`     | Emoji и подписи уровней в UI                 |
| `src/statusCopy.ts`      | `/status`                                    |
| `src/promoConfig.ts`     | Срок Premium по промокоду, лимиты `/promo`   |
| `src/handlers/`          | Команды, day, spread, deep, push, middleware |
| `src/deepReading/`       | Сессия, коллаж, промпты deep                 |
| `src/spreadComposite.ts` | Полоса трёх карт (spread + 1-й триплет deep) |
| `assets/cards/`          | PNG колоды (`512×896`)                       |

Подробная таблица — в [AGENTS.md](../AGENTS.md).
