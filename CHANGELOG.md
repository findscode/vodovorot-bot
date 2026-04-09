# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); версии по [SemVer](https://semver.org/lang/ru/). **Когда поднимать MAJOR / MINOR / PATCH** для этого репозитория описано в [CONTRIBUTING.md](CONTRIBUTING.md) (раздел «Версионирование»).

## [Unreleased]

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

[Unreleased]: https://github.com/findscode/vodovorot-bot/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/findscode/vodovorot-bot/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/findscode/vodovorot-bot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/findscode/vodovorot-bot/releases/tag/v1.0.0
