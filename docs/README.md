# Документация Водоворот

**Текущая версия:** `package.json` и [CHANGELOG.md](../CHANGELOG.md).

## Оператор и деплой

| Документ                       | Зачем                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| [DEPLOY.md](./DEPLOY.md)       | Переменные окружения, Docker, DigitalOcean, whitelist, лимит «карта дня», push, логи и runbook |
| [BOTFATHER.md](./BOTFATHER.md) | Тексты About / Description / Commands для @BotFather                                           |
| [PRIVACY.md](./PRIVACY.md)     | Политика конфиденциальности (URL в BotFather)                                                  |

## Продукт и контент

| Документ                           | Зачем                                                     |
| ---------------------------------- | --------------------------------------------------------- |
| [BRAND-GUIDE.md](./BRAND-GUIDE.md) | Тон бота и правила формата толкований                     |
| [GLOSSARY.md](./GLOSSARY.md)       | Термины для копирайта и промптов                          |
| [ROADMAP.md](./ROADMAP.md)         | Минорные релизы, v3.0 «Глубинная диагностика», milestones |

## Разработка

| Документ                              | Зачем                                  |
| ------------------------------------- | -------------------------------------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | SemVer, релизы, Conventional Commits   |
| [DEV-PROCESS.md](./DEV-PROCESS.md)    | Branch protection, CI, секреты Actions |
| [BRANCHING.md](./BRANCHING.md)        | `main`, `feature/*`, `fix/*`           |

## Код (ориентир после 2.14)

| Путь                                   | Роль                                             |
| -------------------------------------- | ------------------------------------------------ |
| `src/bot.ts`                           | Запуск Telegraf, `registerHandlers`, `bot.catch` |
| `src/handlers/`                        | Команды, «На день», расклад, push, middleware    |
| `src/cardOfDayDelivery.ts`             | Выдача «карта дня» (ИИ → фото → чанки)           |
| `src/dayPushScheduler.ts`              | Cron рассылки                                    |
| `src/ai.ts`, `src/openRouterModels.ts` | OpenRouter и промпты                             |
| `src/deepReading/`                     | Глубинная диагностика (сессия, коллаж)           |
| `assets/cards/`                        | PNG карт колоды (`512×896`, скругление 16px)     |
