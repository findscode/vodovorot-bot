# Водоворот (Vodovorot)

Telegram-бот Таро на **Node.js 20+**, **TypeScript**, **Telegraf**. Толкования через **OpenRouter** (Chat Completions, free-tier fallback). **v3.0** — [глубинная диагностика](docs/ROADMAP.md#ветка-30--глубинная-диагностика) (до 7 вопросов за одно гадание).

**Версия:** в `package.json` и [CHANGELOG.md](CHANGELOG.md). **Прод** — обычно **DigitalOcean Droplet** (Docker Compose); переменные, деплой и runbook — [docs/DEPLOY.md](docs/DEPLOY.md).

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и заполните переменные.
2. `npm install`
3. Разработка: `npm run dev`
4. Прод: `npm run build` → `npm start`

Изображения карт — в `assets/cards/` (уже в репозитории).

## Документация

Полный указатель: **[docs/README.md](docs/README.md)**.

- [Деплой и runbook](docs/DEPLOY.md) · [BotFather](docs/BOTFATHER.md) · [Privacy](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md) · [Бренд](docs/BRAND-GUIDE.md) · [Глоссарий](docs/GLOSSARY.md)
- [Ветки](docs/BRANCHING.md) · [GitHub-процесс](docs/DEV-PROCESS.md) · [Участие и релизы](CONTRIBUTING.md)

## Версии и релизы

Правила версионирования и релизов — в [CONTRIBUTING.md](CONTRIBUTING.md) (SemVer, теги `v*`, GitHub Releases, `CHANGELOG.md`).

## Участие

См. [CONTRIBUTING.md](CONTRIBUTING.md): стиль сообщений коммитов (Conventional Commits), PR в защищённый `main`, релизы.
