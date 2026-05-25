# Деплой

Бот — долгоживущий процесс (`npm start`), удобно крутить в **Docker** на VPS. Основной сценарий с **2.7.0** — [DigitalOcean Droplet](https://www.digitalocean.com/products/droplets) и [`docker-compose.yml`](../docker-compose.yml); опционально **деплой из GitHub Actions** по SSH.

См. также [docs/README.md](README.md) (указатель документации) и [ROADMAP.md](ROADMAP.md) (план релизов).

**Прод:** типично один Droplet с каталогом приложения (например `/opt/vodovorot-bot`), файлом **`.env`** на сервере и именованным томом Docker для **`data/`** (SQLite).

**Личные сообщения:** бот рассчитан на работу **только в private-чате** с пользователем. В группах и каналах обновления **не обрабатываются** (ответов нет).

**Профиль в BotFather (About, Description, Privacy Policy):** см. [docs/BOTFATHER.md](BOTFATHER.md).

**Команды в BotFather (@BotFather → Edit Bot → Edit Commands)** — выставить вручную:

| Команда    | Подсказка (пример)                                 |
| ---------- | -------------------------------------------------- |
| `start`    | Старт и клавиатура раскладов                       |
| `menu`     | Показать клавиатуру снова                          |
| `help`     | Справка: доступ, расклады, рассылка                |
| `pushtime` | Время ежедневной рассылки (если подписка включена) |
| `promo`    | Активировать промокод Premium                      |

`/status` в меню BotFather не нужен — команда по-прежнему открывает ту же справку, что `/help`.

Подробные тексты About/Description — в [BOTFATHER.md](BOTFATHER.md).

## Переменные окружения

Задайте те же переменные, что в [`.env.example`](../.env.example):

- `BOT_TOKEN` (обязательно)
- **`DATABASE_PATH`** (опционально) — файл **SQLite**; по умолчанию **`./data/vodovorot.db`**. В проде смонтируйте **том** на каталог `data` (в `docker-compose.yml` — `vodovorot-data:/app/data`) или задайте абсолютный путь на постоянный диск хоста.
- **`OPENROUTER_API_KEY`** (обязательно для ИИ) — ключ [OpenRouter](https://openrouter.ai/keys). Толкования идут через [Chat Completions](https://openrouter.ai/docs/api/reference/overview).
- Цепочка **бесплатных** моделей (`:free`) задана в [`src/openRouterModels.ts`](../src/openRouterModels.ts): последовательный **fallback** (не «умный роутер») — при 429, недоступной модели, гео-ограничении провайдера или пустом ответе пробуется следующая модель; при 401/прочих фатальных ошибках цепочку не перебираем.
- При «подозрении» на англоязычную выдачу бот делает **второй** запрос (роль «редактор») с той же цепочкой моделей.
- **`ADMIN_TELEGRAM_USER_IDS`** (опционально) — числовые user id через запятую/пробел/`;`: при старте им в БД выставляется **админ** (полный доступ + `/admin`).
- `DAY_DRAW_STATE_PATH` (опционально) — только для **однократной миграции** слотов из JSON 1.x в SQLite; см. ниже
- `DAY_DRAW_TIMEZONE`, **`DAY_PUSH_DEFAULT_HHMM`** (опционально) — см. разделы «Лимит карты дня» и «Подписка на карту дня»

В проде: файл **`.env`** рядом с `docker-compose.yml` (не в git), не внутри образа.

### Админы (полный доступ + флаг в БД)

1. **Через окружение (рекомендуется):** задайте **`ADMIN_TELEGRAM_USER_IDS`** — числа через запятую, пробел или `;`. При **каждом старте** процесса для этих id в SQLite выставляется `is_admin = 1`.
2. **Вручную в SQLite:** при необходимости без смены env — обновите таблицу `users` (`is_admin = 1` для нужного `telegram_user_id`); путь к файлу — **`DATABASE_PATH`** или по умолчанию `data/vodovorot.db`.

После смены переменных перезапустите сервис.

### Команды `/admin` (только `is_admin` в БД)

| Команда                | Действие                                                |
| ---------------------- | ------------------------------------------------------- |
| `/admin`               | Справка                                                 |
| `/admin stats`         | Число пользователей и активных Premium                  |
| `/admin info ID`       | Tier (с emoji), Premium, рассылка                       |
| `/admin grant ID ДНЕЙ` | Выдать Premium (симуляция оплаты в фокус-группе)        |
| `/admin revoke ID`     | Снять Premium                                           |
| `/admin promo`         | Сгенерировать промокод (таро-имя) → Premium **31** день |
| `/admin promo list`    | Статус кодов: свободен / активирован и user id          |

### Публичный бот и уровни доступа

Бот **открыт для всех** в личных чатах. Без Premium (tier **`basic`**): «На день»; расклад «Прошлое — настоящее — будущее» — до **3** раз за календарные сутки (сначала «Начать», затем вопрос); глубинная диагностика до **3** вопросов без общего финала. **Premium** (промокод или `/admin grant`): spread **без лимита**, deep до **7** вопросов с финалом. В чате пользователю tier не показывается как «новичок» — только факт **Premium** при активации и emoji у **фич** (🌱 базовый уровень, ⭐️ Premium).

**In-bot «Что нового» (с 3.7.0):** при первом `/start`, `/menu` или нажатии кнопки расклада после деплоя — краткий блок изменений; «Понятно» → `users.last_seen_release`. Код: `src/releaseNotes.ts`.

**Активация промокода:** `/promo КОД` или кнопка «Промокод (Premium)». Каждый код — **31** день Premium, одноразовый. Формат: таро-префикс + случайный суффикс (например `STAR-LANTERN-K7NP4X`); перебор словарём таро не сработает. Лимит **10** попыток `/promo` на пользователя за **15** минут; ответы при ошибке унифицированы (без подсказки «код существует»).

### Фокус-группа (без реальной оплаты)

Полный чеклист запуска: **[FOCUS-GROUP.md](FOCUS-GROUP.md)** (smoke-тест, бриф, обратная связь).

1. Админ: **`/admin promo`** — бот выдаёт код вроде `STAR-LANTERN-K7NP4X` (таро-префикс + случайный суффикс); передай участнику.
2. При необходимости точечно: **`/admin grant ID ДНЕЙ`**.
3. Позже — автоматическая выдача кода после оплаты (вне текущего этапа).

Уровни в коде: `basic` | `premium` | `admin` — `src/accessTier.ts`. Emoji в UI — `src/tierDisplay.ts` (см. [BRAND-GUIDE § emoji](./BRAND-GUIDE.md#4-emoji-уровней-доступа-в-ui)). См. [ROADMAP § модель C](./ROADMAP.md#модель-c--уровни-доступа-реализовано).

### Лимит «карта дня» и SQLite

**Глубинная диагностика (v3.0+):** состояние сессии только **in-memory** (TTL 24 ч), как `dayInFlight` — перезапуск контейнера обрывает незавершённые гадания без записи в SQLite. Callback: `deep`, `deep_start`, `deep_cancel`, `deep_end`. На полную сессию до **8** вызовов OpenRouter (до 7 триплетов + финал); при `[ai_error]` на триплете шаг не засчитывается, колода сессии не уменьшается. Коллаж 2–7-го триплета — наслоение в `compositeStack.ts` (см. [ROADMAP §3.0](./ROADMAP.md#ветка-30--глубинная-диагностика)).

У **каждого** пользователя карту на день можно вытянуть **не чаще одного раза за календарные сутки** по календарной дате в часовом поясе **`DAY_DRAW_TIMEZONE`** (IANA; по умолчанию **`Europe/Moscow`**, UTC+3). В чате — нейтральные формулировки («после полуночи», «за календарные сутки»), без городов и без сырого `Europe/...`. Слот **резервируется до** выдачи; порядок **ИИ → фото → текст** (и вручную, и в push). При сбое ИИ или Telegram слот **откатывается** — день не «сжигается». В логах: `[day_delivery] ai_error` vs `delivery_error`. Прод — **один** процесс (`docker compose`); защита от двойного тапа — in-memory `dayInFlight`.

**Ожидание ответа ИИ:** для ручного «на день», расклада «три карты» и рассылки push в ленту **не** отправляется отдельное сообщение вроде «Секунду…» — только периодический chat action **«печатает…»** (`typing`), см. `typingIndicator.ts` и [ROADMAP 2.5–2.6](./ROADMAP.md#план-ветки-2x-польза-и-ощущение).

Слоты хранятся в таблице **`day_draw_slots`** в файле БД (**`DATABASE_PATH`**, по умолчанию **`data/vodovorot.db`**).

- **Миграция с 1.x:** если таблица слотов пуста и существует legacy JSON (путь **`DAY_DRAW_STATE_PATH`** или дефолт **`data/day-draw-state.json`**), при старте строки **один раз** импортируются в SQLite.
- **Том на `data/`** обязателен в проде, иначе при пересборке образа БД и подписки пропадут.

### Подписка на «карту дня» (авто)

Код: `dayPushScheduler.ts` (cron), `dayPushTickLogic.ts` (решение «слать / пропустить»), `dayPushApplyResult.ts` (исход доставки), `dayPushRetry.ts` (счётчик сбоев in-memory), `cardOfDayDelivery.ts`.

**Два независимых факта в SQLite:**

| Поле / таблица                      | Смысл                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **`day_draw_slots`**                | Лимит «на день» (ручная кнопка **или** успешная выдача push/ручной)                                                              |
| **`users.day_push_last_sent_date`** | День, когда цикл рассылки **закрыт** (`markDayPushClosedForTodaySync`: успешная доставка или пропуск — слот «на день» уже занят) |

Колонка `day_push_last_calendar_date` в старых БД **не читается** приложением (миграция добавляет `day_push_last_sent_date` при старте).

Пользователь после ручного «на день» может включить **«Присылать каждый день»**: время по умолчанию — **`DAY_PUSH_DEFAULT_HHMM`** (`ЧЧ:ММ` 00:00–23:59), смена — кнопка **«Время рассылки»** или **`/pushtime`** (пресеты / `14:30`). В БД: `day_push_local_hhmm`, `day_push_timezone` (при включении — текущий **`DAY_DRAW_TIMEZONE`**).

**Планировщик:** раз в минуту + **catch-up сразу при старте** бота (после деплоя не ждать следующей минуты). Отправка, если локальное время ≥ `day_push_local_hhmm` в поясе подписчика и push за сегодня ещё не в `day_push_last_sent_date`.

- **Ручная карта до времени рассылки:** слот занят → push не дублирует карту, день в `day_push_last_sent_date` закрывается **без сообщения в чат** (только лог `слот … занят`).
- **Сбой ИИ / Telegram в push:** до **3** попыток за сутки (`ai` и `delivery` отдельно, in-memory); слот **не** занят; `day_push_last_sent_date` **не** ставится; сообщение об ошибке — **один раз** за сутки на тип сбоя.
- **Повторная подписка:** `day_push_last_sent_date` сбрасывается — catch-up в тот же день возможен, если слот свободен.

Отписка — «Отписаться от ежедневной карты» или кнопка под разбором «на день».

**Ручная проверка push (оператор):** подписаться → выставить `/pushtime` на ближайшие 2–3 минуты → в логах дождаться `к отправке=1` и `доставлено ok` → убедиться, что карта пришла в ЛС. После деплоя в окно рассылки — убедиться, что сработал catch-up (строка отправки в первые секунды после `Планировщик:`).

### Промокоды Premium

- **Рекомендуемый способ:** `/admin promo` (генерация) и `/admin promo list` (статус: свободен / кто активировал).
- В таблице **`promo_codes`**: `code`, `premium_days` (для автогенерации — **31**), опционально `valid_from` / `valid_until`, `redeemed_at` / `redeemed_by_user_id`.
- Код **одноразовый глобально**: повторная активация — отказ с тем же текстом, что и при неверном коде.
- Ручной INSERT в SQLite — только для исключений (код должен соответствовать формату в `usersRepo.normalizePromoCode`):

```bash
sqlite3 /path/to/vodovorot.db "INSERT INTO promo_codes (code, premium_days, valid_from, valid_until) VALUES ('WELCOME-31D-AB12CD', 31, NULL, NULL);"
```

**Просроченные callback** у inline-кнопок: Telegram иногда отклоняет `answerCallbackQuery` — бот отвечает на callback без лишнего шума в логах.

## Mini App «Настройки» (4.1+)

**Гибрид:** гадание — кнопки в чате; tier, рассылка «На день», справка и ссылка на [PRIVACY.md](./PRIVACY.md) — в **WebApp**.

| Переменная           | Назначение                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `WEBAPP_DOMAIN`      | Домен для TLS (A-запись на IP дроплета). Без своего домена: `134-122-69-116.sslip.io` (подставьте свой IP через дефис) |
| `ACME_EMAIL`         | Email для Let's Encrypt (обязателен с `WEBAPP_DOMAIN`)                                                                 |
| `WEBAPP_PUBLIC_URL`  | Явный HTTPS-URL Mini App (без `/` в конце); если пусто — `https://WEBAPP_DOMAIN/webapp`                                |
| `WEBAPP_PATH`        | Путь Mini App (по умолчанию `/webapp`)                                                                                 |
| `WEBAPP_PORT`        | Порт HTTP бота внутри compose (по умолчанию **8080**, только localhost на хосте)                                       |
| `WEBAPP_PRIVACY_URL` | Ссылка на политику в App (опционально)                                                                                 |

### Вариант A — Caddy в compose (рекомендуется на дроплете)

В `.env` на сервере:

```env
WEBAPP_DOMAIN=134-122-69-116.sslip.io
ACME_EMAIL=you@example.com
```

(`sslip.io` резолвит `134-122-69-116.sslip.io` → `134.122.69.116`; позже можно заменить на свой домен.)

```bash
cd /opt/vodovorot-bot
ufw allow 80/tcp
ufw allow 443/tcp
COMPOSE_PROFILES=webapp docker compose up -d --build
```

Или скрипт: `bash scripts/compose-up.sh`.

Caddy (`deploy/Caddyfile`) проксирует:

- `/webapp/*` → бот (статика Mini App)
- `/api/webapp/*` → бот (API с `initData`)
- `/health` → проверка

Бот выставит `WEBAPP_PUBLIC_URL` и Menu Button «Настройки» при старте.

### Вариант B — свой nginx/Caddy на хосте

Прокси `https://…/webapp/` → `http://127.0.0.1:8080/` и `/api/webapp/` → `:8080`; в `.env` задайте `WEBAPP_PUBLIC_URL`.

Команды `/help`, `/status`, `/pushtime` в чате **остаются** (запасной путь). Статика: `webapp/public/`.

## Картинки карт

В репозитории — **`assets/cards/00.png` … `77.png`**: холст **512×896**, cover, скругление **16px**, прозрачные углы. Docker-образ копирует их из репозитория без отдельного тома.

Заменить иллюстрации: положите готовые `NN.png` того же формата в `assets/cards/` и закоммитьте. Legacy **`*.jpg`** в репозитории больше не используются.

Если клон станет слишком тяжёлым — [Git LFS](https://git-lfs.com/).

## Сборка образа локально

Из корня репозитория:

```bash
docker build -t vodovorot-bot .
docker run --rm -v vodovorot-data:/app/data -e BOT_TOKEN=... -e OPENROUTER_API_KEY=... -e ADMIN_TELEGRAM_USER_IDS=123456789 vodovorot-bot
```

## DigitalOcean Droplet (основной сценарий)

Бот ходит в Telegram через **long polling** (`bot.launch()`): **входящие порты на дроплете не нужны** (достаточно исходящего HTTPS).

### Первичная настройка (один раз)

1. **ОС:** Ubuntu 22.04/24.04, [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) + `docker compose`.
2. **`.env`** в `/opt/vodovorot-bot` (не в git): из [`.env.example`](../.env.example) — `BOT_TOKEN`, `OPENROUTER_API_KEY`, при необходимости `ADMIN_TELEGRAM_USER_IDS`. Старые `ALLOWED_TELEGRAM_USER_IDS` и `CLOUDFLARE_*` не используются.
3. **Git:** read-only **deploy key** в Settings → Deploy keys; клон по SSH — см. ниже. На тарифе **512 MB** для `docker compose build` часто нужен **swap 2 GB** (см. блок «git + deploy key»).
4. **Секреты Actions** для автодеплоя — в следующем разделе.

Успешный старт: `docker compose logs -f bot` без ошибки про `BOT_TOKEN`; бот отвечает в Telegram.

### Обновление вручную

```bash
cd /opt/vodovorot-bot
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes'
git pull --ff-only origin main
docker compose up -d --build
```

Том **`vodovorot-data`** (в `docker-compose.yml`) хранит SQLite между пересборками.

### GitHub Actions → Droplet (автодеплой)

Workflow [`.github/workflows/deploy-digitalocean.yml`](../.github/workflows/deploy-digitalocean.yml):

1. Push в **`main`** → job **CI** (`lint-test-build`).
2. После **успешного** CI автоматически стартует **Deploy DigitalOcean** (через `workflow_run`).
3. На дроплете: `git pull` + `docker compose up -d --build`.

Ручной запуск: **Actions** → **Deploy DigitalOcean** → **Run workflow**.

Если не заданы **`DO_SSH_HOST`** и **`DO_SSH_PRIVATE_KEY`**, deploy-job пропускается.

#### Секреты в GitHub

**Settings → Secrets and variables → Actions**:

| Секрет                   | Пример                                                                                            | Назначение                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`DO_SSH_HOST`**        | `134.122.69.116`                                                                                  | публичный IP дроплета                                        |
| **`DO_SSH_USER`**        | `root`                                                                                            | пользователь SSH (тот, у кого в `authorized_keys` ваш ключ)  |
| **`DO_SSH_PRIVATE_KEY`** | **полный** приватный ключ `~/.ssh/id_ed25519` (от `-----BEGIN` до `-----END`, с переводами строк) | вход Actions → дроплет; **не** GitHub deploy key репозитория |
| **`DO_APP_DIR`**         | `/opt/vodovorot-bot`                                                                              | опционально; каталог git-клона                               |

Локально (PowerShell), если секретов ещё нет:

```powershell
gh secret set DO_SSH_HOST --body "134.122.69.116"
gh secret set DO_SSH_USER --body "root"
Get-Content $env:USERPROFILE\.ssh\id_ed25519 -Raw | gh secret set DO_SSH_PRIVATE_KEY
gh secret set DO_APP_DIR --body "/opt/vodovorot-bot"
```

Проверка с ПК (тот же ключ, что в `DO_SSH_PRIVATE_KEY`):

```powershell
ssh -o BatchMode=yes root@134.122.69.116 "echo ok"
```

Публичная часть должна быть в `/root/.ssh/authorized_keys` на дроплете. Ошибка CI `unable to authenticate, attempted methods [none publickey]` почти всегда значит: в секрет попал **не тот** ключ (например deploy key), обрезанный текст или ключ без переводов строк — перезапишите секрет командой выше.

Ручной прогон деплоя: **Actions → Deploy DigitalOcean → Run workflow**.

#### Один раз на дроплете: git + deploy key

Репозиторий **приватный** — для `git pull` на сервере нужен **read-only deploy key** (отдельно от `DO_SSH_PRIVATE_KEY`).

На дроплете:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/github_deploy -N "" -C "vodovorot-droplet-deploy"
cat /root/.ssh/github_deploy.pub
```

Публичный ключ добавьте в GitHub: **репозиторий → Settings → Deploy keys → Add deploy key** (read-only), заголовок например `droplet-finds`.

Или с ПК (после `scp` ключа с дроплета):

```bash
gh repo deploy-key add ./github_deploy.pub --title droplet-finds
```

Клон и первый запуск (на дроплете; `.env` заранее положите в `/opt/vodovorot-bot` или скопируйте после клона):

```bash
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes'
git clone git@github.com:findscode/vodovorot-bot.git /opt/vodovorot-bot
cd /opt/vodovorot-bot
# при необходимости swap 2 GB (один раз на 512 MB droplet):
# fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
docker compose up -d --build
```

Смена **`OPENROUTER_API_KEY`**: отредактируйте `.env` на сервере, затем `docker compose up -d --force-recreate`.

Дальнейшие деплои из Actions: `git pull` + `docker compose up -d --build` в `DO_APP_DIR`.

## Логи и runbook (оператор)

Просмотр в каталоге приложения на дроплете:

```bash
cd /opt/vodovorot-bot
docker compose logs -f --tail 200 bot
```

Полезные фильтры:

```bash
docker compose logs bot 2>&1 | grep -E '\[ai_|day_push|day\]'
```

| Префикс / строка                      | Значение                                                  | Действие                                                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[ai_success]`                        | Толкование от OpenRouter получено                         | Норма                                                                                                                                                                                              |
| `[ai_error]` / `[ai_russian_polish]`  | Сбой или деградация ИИ (сеть, 401, таймаут, пустой ответ) | Проверить `OPENROUTER_API_KEY`, квоту free-моделей; пользователь может повторить «На день» (слот не занят при ошибке до успеха)                                                                    |
| `[day_push]`                          | Планировщик рассылки (тик, catch-up при старте, доставка) | `к отправке=N` — кому слать; `доставлено ok` — успех; `слот … занят` — ручная карта; `ai_error` / `delivery_error` с `попытка N/3`; `предыдущий тик ещё выполняется` — долгий ИИ, минута пропущена |
| `[day_delivery] ai_error`             | OpenRouter / `completeChat`                               | Слот дня не занят; ручной «На день» можно повторить                                                                                                                                                |
| `[day_delivery] delivery_error`       | Telegram (фото/текст)                                     | Слот откатан; push повторит cron, ручной — повтор кнопки                                                                                                                                           |
| `[day] слот` / `slot_race`            | Гонка двух запросов «На день» на одну дату                | Редко; один слот на сутки — норма                                                                                                                                                                  |
| `Слушаю Telegram` / `публичный режим` | Бот поднялся                                              | После деплоя проверить ответ в Telegram и `Europe/Moscow` в строке лимита дня                                                                                                                      |

**Ротация `OPENROUTER_API_KEY`:** новый ключ в [openrouter.ai/keys](https://openrouter.ai/keys) → правка `.env` на сервере → `docker compose up -d --force-recreate`. Старый ключ отозвать в кабинете OpenRouter.

**Масштаб рассылки:** при **~10** подписчиках текущий cron (раз в минуту, полный обход) достаточен. Оптимизация batch/jitter — milestone **v2.16** (backlog), когда подписчиков **50+** или есть пики нагрузки.

## Релиз (тег `vX.Y.Z`)

Когда `main` стабилен и CI зелёный:

1. Перенесите пункты в [CHANGELOG.md](../CHANGELOG.md), обновите `version` в [package.json](../package.json).
2. Коммит (например `chore: release v2.18.0`), затем:

```bash
git tag -a vX.Y.Z -m "vodovorot vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

3. Workflow **Release** создаст GitHub Release — подробности в [CONTRIBUTING.md](../CONTRIBUTING.md#релиз-пошагово).
