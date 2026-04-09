# Процесс разработки (GitHub)

Краткая инструкция для настройки репозитория. Точные названия пунктов меню могут слегка отличаться в новых версиях GitHub UI.

## Ветки

- **`main`** — стабильная линия; в неё попадает только через Pull Request (или согласованный hotfix-процесс).
- Рабочие ветки: `feature/кратко-о-задаче`, `fix/кратко`.

## Защита ветки `main`

**Settings → Branches → Branch protection rules → Add rule** (или редактирование правила для `main`):

1. **Branch name pattern:** `main`
2. Включить **Require a pull request before merging** (при необходимости — запретить само-апрув или задать число ревьюеров).
3. Включить **Require status checks to pass before merging** и отметить обязательные job’ы из CI, например:
   - `lint-test-build` (имя job из `.github/workflows/ci.yml`; после первого успешного прогона оно появится в списке).
4. Рекомендуется **Require branches to be up to date before merging**.
5. Включить **Do not allow bypassing the above settings** для админов, если хотите единые правила для всех.
6. Чтобы запретить прямой push в `main`: в том же правиле включите **Restrict who can push to matching branches** и не добавляйте никого (или только сервисных ботов, если используете автоматизацию) — либо полагайтесь на обязательный PR + required checks (прямой push останется технически возможен для админов без пункта 5–6; самый жёсткий вариант — **Lock branch** в исключительных случаях).

После первого успешного запуска Actions откройте PR и убедитесь, что в настройках protection виден чек `lint-test-build`.

## Секреты CI

**Settings → Secrets and variables → Actions**

- Для текущего `ci.yml` секреты **не обязательны** (сборка без токена бота).
- Для деплоя из Actions в Railway: **`RAILWAY_TOKEN`** (и при необходимости **`RAILWAY_SERVICE`**), см. [DEPLOY.md](DEPLOY.md). Другие примеры: `FLY_API_TOKEN`, `BOT_TOKEN` — только если соответствующий workflow включён; не коммитьте значения в репозиторий.

## Issues и PR

Используйте шаблоны из `.github/`: описание бага/фичи, чеклист в PR. Связывайте PR с issue через `Closes #123` в описании.

## Релизы

Пошагово: [CONTRIBUTING.md](../CONTRIBUTING.md) и workflow `.github/workflows/release.yml` при push тега `v*`.
