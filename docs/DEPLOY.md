# Деплой

Бот — долгоживущий процесс (`npm start`), удобно крутить в контейнере или на VPS. Ниже: **Docker**, **Railway**, опционально **деплой из GitHub Actions**.

## Переменные окружения

Задайте те же переменные, что в [`.env.example`](../.env.example):

- `BOT_TOKEN` (обязательно)
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (обязательно для ИИ)
- `CLOUDFLARE_AI_MODEL` (опционально)
- `ALLOWED_TELEGRAM_USER_IDS` (опционально) — см. ниже

На платформе: **Secrets** / **Variables**, не файл в образе.

### Whitelist (только приглашённые тестировщики)

Если задать **`ALLOWED_TELEGRAM_USER_IDS`**, бот обрабатывает обновления **только** от перечисленных пользователей (числовой **user id**, не `@username`).

- **Формат:** один или несколько id через запятую, пробел или `;`, например `123456789,987654321`.
- **Пустое значение или отсутствие переменной** — бот ведёт себя как раньше, отвечает **всем** (режим открытого доступа).
- **Неверный формат** (буквы, пустой список при непустой строке) — процесс завершится при старте с сообщением в лог.

**Что сделать вручную:**

1. Узнать **user id** каждого тестировщика (в личке с ботом): например [@userinfobot](https://t.me/userinfobot) или [@RawDataBot](https://t.me/RawDataBot) — в ответе будет число `Id`.
2. **Локально:** добавить строку в `.env` (не коммитить):  
   `ALLOWED_TELEGRAM_USER_IDS=<id1>,<id2>`
3. **Railway (или другая платформа):** **Variables** → создать/обновить `ALLOWED_TELEGRAM_USER_IDS` тем же значением, **перезапустить** сервис.
4. Проверить с **разрешённого** аккаунта (`/start`, кнопки) и с **стороннего** — должно прийти короткое сообщение об отсутствии доступа.
5. Когда будете готовы к открытому доступу — **удалите** переменную или оставьте пустой (и снова перезапустите).

## Картинки карт

Файлы **`assets/cards/00.jpg` … `77.jpg`** хранятся в репозитории (десятки МБ), чтобы Docker-образ на Railway сразу содержал изображения без отдельного тома.

Обновить набор: локально `npm run download-cards`, затем коммит.

**Почему раньше предлагали не коммитить:** меньше размер клона и истории Git. Для одного бота и фиксированной колоды коммит проще, чем тома или шаг загрузки при сборке. Если репозиторий станет тяжёлым — можно перейти на [Git LFS](https://git-lfs.com/).

## Сборка образа локально

Из корня репозитория:

```bash
docker build -t vodovorot-bot .
docker run --rm -e BOT_TOKEN=... -e CLOUDFLARE_ACCOUNT_ID=... -e CLOUDFLARE_API_TOKEN=... -e ALLOWED_TELEGRAM_USER_IDS=123,456 vodovorot-bot
```

## Railway (основной сценарий)

### Чеклист

1. [Railway](https://railway.app/) → **New Project** → **Deploy from GitHub repo** → выбрать `vodovorot-bot`.
2. Сервис должен собираться по **Dockerfile** в корне (при необходимости отключите Nixpacks / укажите Docker).
3. **Variables**: все ключи из `.env.example` (значения только в Railway).
4. **Deployments / Logs**: успешный старт, нет ошибки про отсутствие `BOT_TOKEN`.

### Два способа деплоя при push в `main`

| Способ            | Что сделать                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Встроенный**    | В Railway включён деплой из GitHub: каждый push в `main` собирает репо на стороне Railway.                                                                 |
| **Через Actions** | Workflow [`.github/workflows/deploy-railway.yml`](../.github/workflows/deploy-railway.yml): после **успешного** CI на `main` вызывается `railway up --ci`. |

Используйте **что-то одно**. Если оставить оба, получите **два деплоя** на один push — отключите авто-деплой из GitHub в настройках сервиса Railway **или** не задавайте секрет `RAILWAY_TOKEN` (тогда workflow Deploy Railway будет пропускаться).

### GitHub Actions → Railway

1. В Railway: **Project → Settings → Tokens** (или аналог) → создайте **Project token** для нужного окружения.
2. В GitHub репозитория: **Settings → Secrets and variables → Actions**:
   - **`RAILWAY_TOKEN`** — project token (обязательно для workflow).
   - **`RAILWAY_SERVICE`** — имя сервиса в проекте, если сервисов несколько (опционально).

3. Убедитесь, что в Railway **отключён** дублирующий деплой из GitHub (см. выше), если включили Actions.

Ручной запуск: вкладка **Actions** → **Deploy Railway** → **Run workflow**.

## Fly.io (кратко)

1. [flyctl](https://fly.io/docs/hands-on/install-flyctl/), регистрация.
2. `fly launch`, секреты `fly secrets set ...`, `fly deploy`.
3. Интеграция с GitHub или деплой из Actions — см. [документацию Fly](https://fly.io/docs/).

## Релиз `v1.0.0` (первый тег)

Когда `main` стабилен и CI зелёный:

1. Обновите при необходимости `CHANGELOG.md` и `package.json` (`version`).
2. Коммит, затем:

```bash
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

3. Workflow **Release** создаст GitHub Release (см. [CONTRIBUTING.md](../CONTRIBUTING.md)).
