# Деплой

Бот — долгоживущий процесс (`npm start`), удобно крутить в контейнере или на VPS. Ниже: **Docker** и два варианта хостинга с бесплатным/условно-бесплатным входом.

## Переменные окружения

Задайте те же переменные, что в [`.env.example`](../.env.example):

- `BOT_TOKEN` (обязательно)
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (обязательно для ИИ)
- `CLOUDFLARE_AI_MODEL` (опционально)

На платформе: **Secrets** / **Variables**, не файл в образе.

## Картинки карт

В образ по умолчанию кладётся пустая `assets/cards`. Чтобы показывать JPEG:

- соберите образ на машине, где уже выполнен `npm run download-cards` и файлы лежат в `assets/cards/`, **или**
- смонтируйте том с картами в `/app/assets/cards`, **или**
- добавьте шаг в Dockerfile: `RUN npm run download-cards` (если скрипт не требует интерактива и подходит для вашей среды сборки).

## Сборка образа локально

Из корня репозитория:

```bash
docker build -t vodovorot-bot .
docker run --rm -e BOT_TOKEN=... -e CLOUDFLARE_ACCOUNT_ID=... -e CLOUDFLARE_API_TOKEN=... vodovorot-bot
```

## Fly.io

1. Установите [flyctl](https://fly.io/docs/hands-on/install-flyctl/), зарегистрируйтесь.
2. `fly launch` в каталоге с репозиторием (можно сгенерировать `fly.toml`; для одного процесса без HTTP удобен **processes** / `[[services]]` с внутренним health или минимальная заглушка — для **long polling** достаточно постоянно работающего процесса).
3. Задайте секреты: `fly secrets set BOT_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...`
4. Деплой: `fly deploy`.

Подключение к GitHub: в дашборде Fly — **GitHub integration** для автодеплоя при push в `main`, либо вызывайте `fly deploy` из GitHub Actions (нужен секрет `FLY_API_TOKEN`).

## Railway

1. Проект на [Railway](https://railway.app/), **New Project → Deploy from GitHub repo**.
2. Укажите корень репозитория; **Dockerfile** подхватится автоматически, если не переопределён build-команда.
3. В **Variables** добавьте все переменные из `.env.example`.
4. Деплой при каждом push в выбранную ветку включается в настройках сервиса.

Учтите лимиты бесплатного/пробного тарифа Railway — они меняются; для продакшена часто берут платный план или VPS.

## GitHub Actions → деплой (идея)

Отдельный workflow по `push` в `main` может вызывать `fly deploy` или Railway CLI при наличии секретов. В репозитории сейчас только **CI**; деплой подключайте, когда будете готовы хранить токены в GitHub Secrets.
