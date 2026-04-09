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

## Сообщения коммитов

Формат — **[Conventional Commits](https://www.conventionalcommits.org/)** на **английском** (так проще читать историю и автогенерацию релизов).

**Структура:** `<type>(<scope>): <краткое описание в повелительном наклонении>`

Пустая строка, затем **тело** (опционально): маркированный список или абзацы с деталями.

**Частые `type`:**

| Тип        | Когда использовать                                  |
| ---------- | --------------------------------------------------- |
| `feat`     | новая возможность для пользователя бота / оператора |
| `fix`      | исправление бага                                    |
| `docs`     | только документация                                 |
| `chore`    | рутина (зависимости, конфиг CI без смены поведения) |
| `ci`       | workflow GitHub Actions                             |
| `test`     | тесты                                               |
| `refactor` | рефакторинг без смены поведения                     |

**`scope`** — короткая зона кода (необязательно): `deploy`, `bot`, `ai`, `deck` и т.п.

**Примеры:**

```text
fix(bot): handle empty AI response without crashing

feat(deploy): add Railway deploy workflow after CI
```

**Не добавляйте** в конец сообщения служебные хвосты вроде `Made-with: Cursor` — они засоряют историю.

Если Cursor (или другой инструмент) **всё равно дописывает** такую строку через `prepare-commit-msg`, сделайте коммит из терминала с пустым каталогом хуков (подставьте путь к существующей **пустой** папке):

```bash
git -c core.hooksPath=/path/to/empty-dir commit …
```

Либо отключите автоподпись в настройках Cursor для интеграции с Git.

## Процесс правок

1. Ветка от `main`: `feature/…`, `fix/…` или `chore/…`.
2. **Прямой push в `main` отключён** (branch protection): изменения только через **Pull Request** и merge после зелёного CI.
3. В описании PR — **что сделано** и **`Closes #номер`** при привязке к issue.
4. CI (lint, тесты, сборка, проверка форматирования) должны быть зелёными.

Подробнее о защите ветки и настройках репозитория: [docs/DEV-PROCESS.md](docs/DEV-PROCESS.md).

## Локальные проверки

```bash
npm run format:check
npm run lint
npm test
npm run build
```
