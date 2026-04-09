# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); версии по [SemVer](https://semver.org/lang/ru/). **Когда поднимать MAJOR / MINOR / PATCH** для этого репозитория описано в [CONTRIBUTING.md](CONTRIBUTING.md) (раздел «Версионирование»).

## [Unreleased]

## [1.4.0] — 2026-04-09

Минорный релиз по [roadmap v1.4.0](docs/ROADMAP.md): только личка, `/help`, единый копирайт, индикатор набора текста.

### Added

- Команда **`/help`**: справка по командам, раскладам, лимиту «на день», дисклеймер; учёт whitelist.
- Модули **`botCopy.ts`** (тексты) и **`typingIndicator.ts`**: периодический `sendChatAction(typing)` на время запроса к Cloudflare AI в раскладах day/spread.
- Тесты для **`isPublicEntryCommand`** (`botCopy.test.ts`).

### Changed

- **Только private-чаты:** middleware отбрасывает обновления из групп и каналов без ответов.
- Тексты `/start` и `/menu` вынесены в `botCopy.ts` и согласованы по смыслу со справкой.

## [1.3.0] — 2026-04-09

Публичная **карта дня** при активном whitelist и суточный лимит для всех.

### Added

- Не в whitelist: доступны `/start`, `/menu` и только расклад **«На день»**; расклад «прошлое — настоящее — будущее» — только у приглашённых id.
- **Лимит 1× за календарные сутки UTC** на пользователя для «карты дня» у всех; состояние в JSON (по умолчанию `data/day-draw-state.json`), опция **`DAY_DRAW_STATE_PATH`**.
- Модуль `dayDrawState.ts`, тесты; `hasFullBotAccess` в `accessWhitelist.ts`; каталог `data/` с `.gitkeep`.

### Changed

- Тексты `/start` и `/menu` и клавиатура зависят от полного доступа; сообщение при отказе в spread обновлено.

### Оператору (вручную)

- Для стабильного лимита на Railway при деплоях: том + `DAY_DRAW_STATE_PATH` — см. `docs/DEPLOY.md`.

## [1.2.0] — 2026-04-09

Опциональный whitelist по Telegram **user id** для закрытого тестирования (минорная функция).

### Added

- Переменная окружения **`ALLOWED_TELEGRAM_USER_IDS`**: если задана непустая строка, бот обрабатывает только перечисленные id; иначе поведение как раньше (доступ для всех).
- Middleware в `bot.ts`: для чужих пользователей — короткий ответ на сообщения и снятие «спиннера» у inline-кнопок.
- Валидация списка при старте; модуль `accessWhitelist.ts` и тесты.
- Документация: `docs/DEPLOY.md` (чеклист вручную), `.env.example`.

### Оператору (вручную после деплоя)

1. Узнать числовой user id тестировщиков (например @userinfobot).
2. Задать `ALLOWED_TELEGRAM_USER_IDS` в `.env` локально и в **Variables** на Railway (или другой платформе), перезапустить сервис.
3. Проверить доступ с разрешённого и чужого аккаунта; для открытого доступа позже — убрать переменную или оставить пустой.

## [1.1.0] — 2026-04-09

Минорный релиз: усиление валидации входных данных и сетевых вызовов, аккуратнее логи.

### Security

- Пути к JPEG карт: `cardId` только в диапазоне колоды (`isValidCardId` / `RangeError` в `cardJPEGPath`), исключение произвольных имён файлов.
- Cloudflare Workers AI: проверка формата `CLOUDFLARE_ACCOUNT_ID` (32 hex) и `CLOUDFLARE_AI_MODEL` (безопасное имя модели в пути URL); таймаут HTTP-запроса к API (120 с).
- Скрипт `download-cards`: загрузка изображений только с хостов `*.wikimedia.org` по HTTPS.

### Changed

- Обработчики бота логируют ошибки ИИ без полного `console.error` объекта (имя, сообщение, причина).

## [1.0.0] — 2026-04-09

Первая зафиксированная версия после PoC (текущее состояние бота).

[Unreleased]: https://github.com/findscode/vodovorot-bot/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/findscode/vodovorot-bot/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/findscode/vodovorot-bot/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/findscode/vodovorot-bot/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/findscode/vodovorot-bot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/findscode/vodovorot-bot/releases/tag/v1.0.0
