# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); версии по [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

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

[Unreleased]: https://github.com/findscode/vodovorot-bot/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/findscode/vodovorot-bot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/findscode/vodovorot-bot/releases/tag/v1.0.0
