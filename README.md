# Водоворот (Vodovorot)

Telegram-бот Таро на **Node.js 20+**, **TypeScript**, **Telegraf**. Толкования через **OpenRouter** (Chat Completions, free-tier fallback).

**Прод** обычно на **DigitalOcean Droplet** (Docker Compose); переменные окружения и runbook — в [docs/DEPLOY.md](docs/DEPLOY.md).

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и заполните переменные.
2. `npm install`
3. (Опционально) картинки карт: `npm run download-cards`
4. Разработка: `npm run dev`
5. Прод: `npm run build` → `npm start`

## Документация

- [Бренд и тон](docs/BRAND-GUIDE.md)
- [Глоссарий](docs/GLOSSARY.md)
- [Схема веток](docs/BRANCHING.md)
- [Процесс разработки и GitHub](docs/DEV-PROCESS.md)
- [Деплой (Docker, DigitalOcean)](docs/DEPLOY.md)
- [BotFather: About, Description, Privacy](docs/BOTFATHER.md)
- [Roadmap минорных релизов и issues](docs/ROADMAP.md)

## Версии и релизы

Правила версионирования и релизов — в [CONTRIBUTING.md](CONTRIBUTING.md) (SemVer, теги `v*`, GitHub Releases, `CHANGELOG.md`).

## Участие

См. [CONTRIBUTING.md](CONTRIBUTING.md): стиль сообщений коммитов (Conventional Commits), PR в защищённый `main`, релизы.
