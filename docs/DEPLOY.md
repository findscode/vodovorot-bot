# Деплой

Бот — долгоживущий процесс (`npm start`), удобно крутить в **Docker** на VPS. Основной сценарий с **2.7.0** — [DigitalOcean Droplet](https://www.digitalocean.com/products/droplets) и [`docker-compose.yml`](../docker-compose.yml); опционально **деплой из GitHub Actions** по SSH.

См. также [docs/README.md](README.md) (указатель документации) и [ROADMAP.md](ROADMAP.md) (план релизов).

**Прод:** типично один Droplet с каталогом приложения (например `/opt/vodovorot-bot`), файлом **`.env`** на сервере и именованным томом Docker для **`data/`** (SQLite).

**Личные сообщения:** бот рассчитан на работу **только в private-чате** с пользователем. В группах и каналах обновления **не обрабатываются** (ответов нет).

**Профиль в BotFather (About, Description, Privacy Policy):** см. [docs/BOTFATHER.md](BOTFATHER.md).

**Команды в BotFather (@BotFather → Edit Bot → Edit Commands)** — выставить вручную:

| Команда    | Подсказка (пример)                                        |
| ---------- | --------------------------------------------------------- |
| `start`    | Старт и клавиатура раскладов                              |
| `menu`     | Показать клавиатуру снова                                 |
| `help`     | Справка и ограничения                                     |
| `last`     | Повторить последний разбор (коротко хранится в переписке) |
| `status`   | Что доступно, подписка на карту дня и Premium             |
| `pushtime` | Время ежедневной рассылки (если подписка включена)        |
| `promo`    | Активировать промокод Premium (`/promo КОД`)              |

Подробные тексты About/Description — в [BOTFATHER.md](BOTFATHER.md).

## Переменные окружения

Задайте те же переменные, что в [`.env.example`](../.env.example):

- `BOT_TOKEN` (обязательно)
- **`DATABASE_PATH`** (опционально) — файл **SQLite**; по умолчанию **`./data/vodovorot.db`**. В проде смонтируйте **том** на каталог `data` (в `docker-compose.yml` — `vodovorot-data:/app/data`) или задайте абсолютный путь на постоянный диск хоста.
- **`OPENROUTER_API_KEY`** (обязательно для ИИ) — ключ [OpenRouter](https://openrouter.ai/keys). Толкования идут через [Chat Completions](https://openrouter.ai/docs/api/reference/overview).
- Цепочка **бесплатных** моделей (`:free`) задана в [`src/openRouterModels.ts`](../src/openRouterModels.ts): последовательный **fallback** (не «умный роутер») — при 429, недоступной модели, гео-ограничении провайдера или пустом ответе пробуется следующая модель; при 401/прочих фатальных ошибках цепочку не перебираем.
- При «подозрении» на англоязычную выдачу бот делает **второй** запрос (роль «редактор») с той же цепочкой моделей.
- `ALLOWED_TELEGRAM_USER_IDS` (опционально) — см. ниже
- **`ADMIN_TELEGRAM_USER_IDS`** (опционально) — числовые user id через запятую/пробел/`;`: при старте им в БД выставляется **админ** (полный доступ к раскладам независимо от whitelist).
- `DAY_DRAW_STATE_PATH` (опционально) — только для **однократной миграции** слотов из JSON 1.x в SQLite; см. ниже
- `DAY_DRAW_TIMEZONE`, **`DAY_PUSH_DEFAULT_HHMM`** (опционально) — см. разделы «Лимит карты дня» и «Подписка на карту дня»

В проде: файл **`.env`** рядом с `docker-compose.yml` (не в git), не внутри образа.

### Админы (полный доступ + флаг в БД)

1. **Через окружение (рекомендуется):** задайте **`ADMIN_TELEGRAM_USER_IDS`** — тот же формат списка, что у `ALLOWED_TELEGRAM_USER_IDS` (числа через запятую, пробел или `;`). При **каждом старте** процесса для этих id в SQLite выставляется `is_admin = 1`.
2. **Вручную в SQLite:** при необходимости без смены env — обновите таблицу `users` (`is_admin = 1` для нужного `telegram_user_id`); путь к файлу — **`DATABASE_PATH`** или по умолчанию `data/vodovorot.db`.

После смены переменных перезапустите сервис.

### Whitelist (приглашённые + публичная «карта дня»)

Если задать **`ALLOWED_TELEGRAM_USER_IDS`** (числовой **user id**, не `@username`):

- **Полный доступ** (оба расклада) — у перечисленных id **или** у пользователей с **активным Premium** в БД (`premium_until` в будущем) **или** у **админов** (`ADMIN_TELEGRAM_USER_IDS` / флаг в БД).
- **Остальные пользователи:** команды `/start`, `/menu`, `/help`, **`/status`**, `/last`, **`/pushtime`**, **`/promo`**, подписка на «карту дня» и кнопка **«На день»**; расклад «прошлое — настоящее — будущее» для них **недоступен** (кнопки в интерфейсе не показываются).
- **Пустое значение или отсутствие переменной** — у **всех** полный доступ (две кнопки), как если бы whitelist не использовался.

**Формат id:** через запятую, пробел или `;`. **Неверный формат** при непустой строке — процесс завершится при старте.

**Что сделать вручную:**

1. Узнать **user id** приглашённых (например [@userinfobot](https://t.me/userinfobot)).
2. **Локально / `.env` на сервере:** `ALLOWED_TELEGRAM_USER_IDS=<id1>,<id2>`, перезапуск контейнера (`docker compose up -d`).
3. Проверить: приглашённый видит **две** кнопки; посторонний — только **«На день»** и не открывает spread.
4. Открыть всем полный доступ — **удалить** переменную или оставить пустой.

### Лимит «карта дня» и SQLite

У **каждого** пользователя карту на день можно вытянуть **не чаще одного раза за календарные сутки** по календарной дате в часовом поясе **`DAY_DRAW_TIMEZONE`** (IANA; по умолчанию **`Europe/Moscow`**, UTC+3). В чате — нейтральные формулировки («после полуночи», «за календарные сутки»), без городов и без сырого `Europe/...`. Слот **резервируется до** выдачи; порядок **ИИ → фото → текст** (и вручную, и в push). При сбое ИИ или Telegram слот **откатывается** — день не «сжигается». В логах: `[day_delivery] ai_error` vs `delivery_error`. Прод — **один** процесс (`docker compose`); защита от двойного тапа — in-memory `dayInFlight`.

**Ожидание ответа ИИ:** для ручного «на день», расклада «три карты» и рассылки push в ленту **не** отправляется отдельное сообщение вроде «Секунду…» — только периодический chat action **«печатает…»** (`typing`), см. `typingIndicator.ts` и [ROADMAP 2.5–2.6](./ROADMAP.md#план-ветки-2x-польза-и-ощущение).

Слоты хранятся в таблице **`day_draw_slots`** в файле БД (**`DATABASE_PATH`**, по умолчанию **`data/vodovorot.db`**).

- **Миграция с 1.x:** если таблица слотов пуста и существует legacy JSON (путь **`DAY_DRAW_STATE_PATH`** или дефолт **`data/day-draw-state.json`**), при старте строки **один раз** импортируются в SQLite.
- **Том на `data/`** обязателен в проде, иначе при пересборке образа БД и подписки пропадут.

### Подписка на «карту дня» (авто)

При сбое ИИ в **авторассылке** бот повторяет попытку в следующие минуты (до **3** раз за календарные сутки), затем перестаёт долбить до завтра; слот дня при этом не занят. Сообщение об ошибке ИИ уходит **один раз** за сутки.

Пользователь после успешного ручного гадания может включить **«Присылать каждый день»**: одно подтверждающее сообщение с временем по умолчанию из **`DAY_PUSH_DEFAULT_HHMM`** (валидное **`ЧЧ:ММ`** 00:00–23:59) и кнопкой **«Время рассылки»** (как **`/pushtime`** без аргумента — пресеты в чате). Раз в минуту планировщик проверяет подписчиков: локальное время из поля **`day_push_local_hhmm`** в часовом поясе, сохранённом при подписке (**`DAY_DRAW_TIMEZONE`** на момент включения). Смена времени также — **`/pushtime 14:30`**. Лимит «один раз за сутки» **общий** с ручным режимом (та же календарная дата по **`DAY_DRAW_TIMEZONE`**). Отписка — кнопкой «Отписаться от ежедневной карты» в сообщении после включения подписки или под разбором «на день».

### Промокоды Premium

- В таблице **`promo_codes`**: поля `code` (строка), `premium_days` (целое), опционально `valid_from` / `valid_until` (ISO UTC), `redeemed_at` / `redeemed_by_user_id` (заполняются при успешной активации).
- Код **одноразовый глобально**: второй пользователь получит отказ.
- Пример добавления кода на 30 дней (выполнить на сервере с установленным `sqlite3` или через клиент БД):

```bash
sqlite3 /path/to/vodovorot.db "INSERT INTO promo_codes (code, premium_days, valid_from, valid_until) VALUES ('WELCOME-2026', 30, NULL, NULL);"
```

### Команда /last (SQLite)

Последний разбор для **`/last`** хранится в таблице **`last_readings`** в том же файле SQLite, что и пользователи и слоты (см. **`DATABASE_PATH`**), с ограничением длины текста. После **перезапуска** сервиса запись сохраняется; удаление — зона ответственности оператора (БД).

**Просроченные callback** у inline-кнопок: Telegram иногда отклоняет `answerCallbackQuery` — бот отвечает на callback без лишнего шума в логах.

## Картинки карт

Файлы **`assets/cards/00.jpg` … `77.jpg`** хранятся в репозитории (десятки МБ), чтобы Docker-образ сразу содержал изображения без отдельного тома на диске.

Обновить набор: замените файлы в `assets/cards/` и закоммитьте.

**Почему раньше предлагали не коммитить:** меньше размер клона и истории Git. Для одного бота и фиксированной колоды коммит проще, чем тома или шаг загрузки при сборке. Если репозиторий станет тяжёлым — можно перейти на [Git LFS](https://git-lfs.com/).

## Сборка образа локально

Из корня репозитория:

```bash
docker build -t vodovorot-bot .
docker run --rm -v vodovorot-data:/app/data -e BOT_TOKEN=... -e OPENROUTER_API_KEY=... -e ALLOWED_TELEGRAM_USER_IDS=123,456 vodovorot-bot
```

## DigitalOcean Droplet (основной сценарий)

Бот ходит в Telegram через **long polling** (`bot.launch()`): **входящие порты на дроплете не нужны** (достаточно исходящего HTTPS).

### Первичная настройка (один раз)

1. **ОС:** Ubuntu 22.04/24.04, [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) + `docker compose`.
2. **`.env`** в `/opt/vodovorot-bot` (не в git): из [`.env.example`](../.env.example) — `BOT_TOKEN`, `OPENROUTER_API_KEY` и при необходимости whitelist. Старые `CLOUDFLARE_*` удалите.
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

| Секрет                   | Пример                         | Назначение                                                   |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| **`DO_SSH_HOST`**        | `134.122.69.116`               | публичный IP дроплета                                        |
| **`DO_SSH_USER`**        | `root`                         | пользователь SSH (тот, у кого в `authorized_keys` ваш ключ)  |
| **`DO_SSH_PRIVATE_KEY`** | **полный** приватный ключ `~/.ssh/id_ed25519` (от `-----BEGIN` до `-----END`, с переводами строк) | вход Actions → дроплет; **не** GitHub deploy key репозитория |
| **`DO_APP_DIR`**         | `/opt/vodovorot-bot`           | опционально; каталог git-клона                               |

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
docker compose logs bot 2>&1 | grep -E '\[ai_|day_push|day\]|Whitelist'
```

| Префикс / строка                     | Значение                                                  | Действие                                                                                                                        |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `[ai_success]`                       | Толкование от OpenRouter получено                         | Норма                                                                                                                           |
| `[ai_error]` / `[ai_russian_polish]` | Сбой или деградация ИИ (сеть, 401, таймаут, пустой ответ) | Проверить `OPENROUTER_API_KEY`, квоту free-моделей; пользователь может повторить «На день» (слот не занят при ошибке до успеха) |
| `[day_push]`                         | Планировщик рассылки                                      | При сбое ИИ — до 3 попыток за сутки, затем пауза до завтра; см. строку `сбой ИИ N раз`                                          |
| `[day_delivery] ai_error`            | OpenRouter / `completeChat`                               | Слот дня не занят; ручной «На день» можно повторить                                                                             |
| `[day_delivery] delivery_error`      | Telegram (фото/текст)                                     | Слот откатан; push повторит cron, ручной — повтор кнопки                                                                        |
| `[day] слот` / `slot_race`           | Гонка двух запросов «На день» на одну дату                | Редко; один слот на сутки — норма                                                                                               |
| `[whitelist] отклонён`               | Пользователь не в whitelist                               | Ожидаемо при закрытом тесте                                                                                                     |
| `Слушаю Telegram`                    | Бот поднялся                                              | После деплоя проверить эту строку и `Europe/Moscow` в строке лимита дня                                                         |

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
