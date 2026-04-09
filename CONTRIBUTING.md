# Участие в разработке

## Версионирование (SemVer)

Версия в `package.json` следует [Semantic Versioning 2.0.0](https://semver.org/lang/ru/):

- **MAJOR** — несовместимые изменения поведения или API для операторов/интеграций.
- **MINOR** — обратно совместимые новые возможности.
- **PATCH** — обратно совместимые исправления.

Git-теги релизов: **`v` + версия**, например `v1.2.3` (совпадает с `package.json` без префикса `v` в поле `version`).

## Релиз (пошагово)

1. Убедитесь, что `main` зелёный в CI.
2. В `CHANGELOG.md` перенесите пункты из **`[Unreleased]`** в новый блок **`[X.Y.Z] — YYYY-MM-DD`**.
3. Обновите **`version`** в `package.json` (без префикса `v`).
4. Коммит (например: `chore: release v1.2.3`).
5. Тег: `git tag vX.Y.Z` и `git push origin main && git push origin vX.Y.Z`.
6. Workflow **Release** (`.github/workflows/release.yml`) создаст [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) с автогенерацией заметок по коммитам; при необходимости отредактируйте текст релиза вручную и сверьте с `CHANGELOG.md`.

Публикация в npm для этого проекта не предполагается (`private: true`).

## Процесс правок

1. Ветка от `main`: `feature/…` или `fix/…`.
2. Pull Request в `main`; в описании — **что сделано** и **`Closes #номер`** при привязке к issue.
3. CI (lint, тесты, сборка, проверка форматирования) должны быть зелёными.

Подробнее о защите ветки и настройках репозитория: [docs/DEV-PROCESS.md](docs/DEV-PROCESS.md).

## Локальные проверки

```bash
npm run format:check
npm run lint
npm test
npm run build
```
