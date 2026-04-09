# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); версии по [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Added

- JPEG карт Таро в `assets/cards/` (репозиторий), образ Docker копирует `assets` в рантайм.
- Workflow **Deploy Railway**: деплой через Railway CLI после успешного CI на `main` (секрет `RAILWAY_TOKEN`).

### Changed

- Документация деплоя: Railway, выбор между встроенным деплоем и GitHub Actions, первый релизный тег.

## [1.0.0] — 2026-04-09

Первая зафиксированная версия после PoC (текущее состояние бота).

После создания репозитория на GitHub добавьте внизу файла ссылки вида `[Unreleased]: …/compare/v1.0.0…HEAD` и `[1.0.0]: …/releases/tag/v1.0.0` для удобства.
