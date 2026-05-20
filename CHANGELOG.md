# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); версии по [SemVer](https://semver.org/lang/ru/). **Когда поднимать MAJOR / MINOR / PATCH** для этого репозитория описано в [CONTRIBUTING.md](CONTRIBUTING.md) (раздел «Версионирование»).

## [Unreleased]

## [2.18.0] — 2026-05-20

Минорный релиз: точнее ошибки выдачи «карта дня» и единый порядок ИИ → фото.

### Changed

- «На день» (ручной и push): сначала ИИ, затем фото — при сбое OpenRouter нет «сиротской» картинки в чате.
- `deliverCardOfDayReading`: опция `{ at }` для ключа календарного дня (планировщик передаёт `now` тика).
- Результат `delivery_error` отдельно от `ai_error`; логи `[day_delivery] ai_error` / `delivery_error`.
- Сообщения: `CARD_DAY_AI_UNAVAILABLE_MESSAGE`, `CARD_DAY_DELIVERY_ERROR_MESSAGE`.

### Added

- `aiErrors.ts` (`isAiFailure`) и тесты.

## [2.17.0] — 2026-05-20

Минорный релиз: runbook логов для оператора.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md): таблица `[ai_*]`, `[day_push]`, `docker compose logs`, ротация OpenRouter, порог v2.16.

## [2.15.0] — 2026-05-20

Минорный релиз: `bot.catch` и общая отправка чанков толкования.

### Changed

- `sendReadingChunksToChat` в `readingChunksDelivery.ts` — расклад «три карты» и «карта дня».
- Глобальный `bot.catch`: короткое сообщение и клавиатура `/menu`.

### Added

- `UNHANDLED_BOT_ERROR_HTML` в `botCopy.ts`.

## [2.14.0] — 2026-05-20

Минорный релиз: тонкий `bot.ts`, хендлеры в `src/handlers/`.

### Changed

- Команды, расклады, подписка и middleware вынесены в `handlers/`; поведение для пользователя без изменений.

## [2.13.0] — 2026-05-20

Минорный релиз: повтор push «карта дня» после сбоя ИИ.

### Changed

- При `ai_error` в рассылке **не** помечаем день обработанным сразу — cron повторяет до **3** попыток за сутки (in-memory).
- После исчерпания попыток — `markDayPushHandled` и лог; сообщение пользователю об ошибке ИИ — **один раз** за сутки.

### Added

- `dayPushAiRetry.ts` и тесты счётчика.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md).

## [2.12.0] — 2026-05-20

Минорный релиз: честный резерв слота «карта дня» до выдачи и откат при сбое.

### Changed

- Слот в `day_draw_slots` занимается **до** фото и ИИ; при `ai_error` — `releaseDayDrawSlot` (повтор «На день» в те же сутки возможен).
- `slot_race` только при занятой дате (без выдачи контента); при гонке вручную — сообщение лимита.
- Push: при неудачном резерве слота поведение без лишней выдачи.

### Added

- `releaseDayDrawSlotSync` в `dayDrawSlotsRepo.ts`; тесты release и двойного consume.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md) — один процесс, порядок слота.

## [2.11.0] — 2026-05-20

Минорный релиз: граница суток «карта дня» снова по UTC+3, единое имя `dayDrawCalendarDate`.

### Changed

- **`DAY_DRAW_TIMEZONE`** по умолчанию **`Europe/Moscow`** (UTC+3); переопределение через `.env` без изменений.
- Везде **`dayDrawCalendarDate`** вместо устаревшего `moscowCalendarDate` (alias удалён).

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md), [`.env.example`](.env.example).

## [2.10.0] — 2026-05-20

Минорный релиз: нейтральные тексты про сутки и UTC по умолчанию для границы «карта дня».

### Changed

- Пользовательские формулировки **без Москвы и городов**: «после полуночи», «за календарные сутки»; время рассылки — «около 9:00» без пояснения IANA в чате.
- Граница суток лимита «карта дня»: **`DAY_DRAW_TIMEZONE`** по умолчанию **UTC** (ранее `Europe/Moscow` в коде и доках).
- CI deploy: убран неподдерживаемый параметр `script_stop` у `appleboy/ssh-action@v1.2.2` (остановка при ошибке — через `set -euo pipefail` в скрипте).

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md), [`.env.example`](.env.example).

## [2.9.0] — 2026-05-20

Минорный релиз: единый вид полосы с картами и ответы толкованием на сообщение с раскладом.

### Changed

- **«Карта на день»:** фото — горизонтальная полоса с одной картой в центральном слоте (чёрный фон, те же высота и ширина кадра, что у средней ячейки расклада «три карты»), вместо крупного одиночного JPEG.
- **Толкование** (расклад «три карты» и «на день»): текст приходит **ответом** на сообщение с изображением и подписью расклада (`reply_parameters`).

### Added

- `dayCardStripPhotoInput` в `spreadComposite.ts`; тесты геометрии полосы.

## [2.8.0] — 2026-05-20

Минорный релиз: толкования через **OpenRouter** вместо Cloudflare Workers AI.

### Changed

- ИИ: [OpenRouter Chat Completions](https://openrouter.ai/docs/api/reference/overview), переменная **`OPENROUTER_API_KEY`**; удалены **`CLOUDFLARE_*`**.
- Последовательный **fallback** по бесплатным моделям (`:free`) из [`src/openRouterModels.ts`](src/openRouterModels.ts) при 429, недоступной модели, гео-ограничении и пустом ответе; фатальные ошибки (401 и т.п.) не перебирают цепочку.
- Второй прогон «редактор» (русская правка) — та же цепочка моделей.

### Added

- Модули `openRouterChat.ts`, `openRouterFallback.ts`, `openRouterModels.ts`; тесты эвристик fallback.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md), [README.md](README.md), [docs/PRIVACY.md](docs/PRIVACY.md), [docs/GLOSSARY.md](docs/GLOSSARY.md), [docs/BOTFATHER.md](docs/BOTFATHER.md), [`.env.example`](.env.example).

## [2.7.0] — 2026-05-20

Минорный релиз: **прод-деплой на DigitalOcean Droplet** вместо Railway.

### Changed

- Прод-сценарий: **Docker Compose** на VPS ([`docker-compose.yml`](docker-compose.yml)), том для `data/` (SQLite).
- CI/CD: workflow [`.github/workflows/deploy-digitalocean.yml`](.github/workflows/deploy-digitalocean.yml) (SSH → `git pull` → `docker compose up -d --build`); удалён `deploy-railway.yml`.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md) — runbook Droplet, автодеплой, deploy key, секреты `DO_SSH_*`.
- [README.md](README.md), [docs/DEV-PROCESS.md](docs/DEV-PROCESS.md).

## [2.6.2] — 2026-04-23

Патч: единый вид **подписей к фото** с картами, фильтрация служебных фраз модели и сохранение «последнего разбора» без артефактов.

### Fixed

- **Толкование:** из текста перед отправкой и перед сохранением в **`/last`** убираются строки-артефакты вроде «Пустая строка.» (`stripModelFormatArtifacts` в `readingTelegramHtml.ts`; вызов перед нарезкой в `cardOfDayDelivery.ts`, `bot.ts`).
- **ИИ:** в **`SYSTEM_PROMPT`** и в промпте второго прогона (русская правка) явно запрещены служебные фразы про оформление ответа.

### Changed

- **Подпись «На день»:** жирное **`Карта на день:`**, пустая строка, строка карты (`dayCardFaceCaptionHtml`); отправка фото/запасного сообщения с **`parse_mode: HTML`** (`cardOfDayDelivery.ts`).
- **Подпись расклада в три карты:** то же правило заголовка — **`Прошлое, настоящее, будущее:`** + список позиций; HTML и лимит подписи через **`threeCardSpreadCaptionHtmlBounded`** (`bot.ts`).

### Docs

- [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md), [docs/GLOSSARY.md](docs/GLOSSARY.md), [docs/ROADMAP.md](docs/ROADMAP.md).

## [2.6.1] — 2026-04-23

### Fixed

- **ИИ:** если ответ толкования **преимущественно на латинице** (эвристика по буквам), выполняется **второй запрос** к Workers AI с ролью редактора — полный перенос на русский при **сохранении структуры** меток и HTML; при сбое второго запроса пользователь получает **первый** ответ.
- Модуль **`aiRussianGate.ts`**: функция **`textLooksNonRussianDominant`** и тесты.

### Changed

- **`ai.ts`**: общая функция запроса к API; основной промпт без изменений по смыслу.

### Docs

- [docs/ROADMAP.md](docs/ROADMAP.md), [docs/PRIVACY.md](docs/PRIVACY.md), [docs/DEPLOY.md](docs/DEPLOY.md).

## [2.6.0] — 2026-04-23

Минорный релиз: **единый UX ожидания ИИ** для ручного «На день».

### Changed

- Ручной запрос **«На день»** (`deliverCardOfDayReading`, режим `manual`): убрано отдельное сообщение **«Секунду…»** перед толкованием — остаётся только индикатор **«печатает…»** (как у расклада «три карты» в 2.5.0 и у рассылки push).
- Удалена неиспользуемая константа **`READING_BUILDING_MESSAGE`** из `botCopy.ts`.

### Docs

- [docs/ROADMAP.md](docs/ROADMAP.md), [docs/DEPLOY.md](docs/DEPLOY.md).

## [2.5.0] — 2026-04-23

Минорный релиз: **UX второй проход** (после повторного аудита).

### Changed

- Расклад **«три карты»**: убрано отдельное сообщение **«Секунду…»** перед ИИ — остаётся индикатор набора (`typing`) во время запроса.
- **«На день»:** debounce, параллельный запрос, лимит суток и ошибка ИИ после карты — ответы **с основной inline-клавиатурой**.
- **Whitelist:** ответ об отказе в доступе — **с клавиатурой** «На день» (или полной, если есть доступ к раскладу).
- После **включения подписки** и после **успешного `/pushtime` / пресета `pt:`** — клавиатура с **«Время рассылки»** и **«Отписаться от ежедневной карты»** (не нужно ждать следующий разбор, чтобы отписаться).
- **`/status`:** в списке команд добавлены **`/pushtime`** и **`/promo`** (с пояснением для рассылки).

### Docs

- [docs/ROADMAP.md](docs/ROADMAP.md), [docs/DEPLOY.md](docs/DEPLOY.md).

## [2.4.0] — 2026-04-23

Минорный релиз: **меньше пользовательских шагов** (роадмап и внутренний UX-аудит).

### Changed

- **Подписка «Присылать каждый день»:** одно сообщение с временем по умолчанию; выбор другого времени — кнопка **«Время рассылки»** или **`/pushtime`** (без обязательного второго сообщения с сеткой пресетов).
- **Первый расклад «на день»:** сразу полная inline-клавиатура (расклады + подписка) под последним чанком толкования; убран отдельный экран только с подпиской и отсылкой к **`/menu`**.
- **Расклад «три карты»:** подсказка «новый расклад…» **в конце последнего** сообщения с текстом, не отдельным сообщением.
- **`/last`:** основная клавиатура на **каждом** чанке повтора, чтобы не листать чат к последнему сообщению.
- **`/pushtime`** и выбор пресета **`pt:`:** без дублирующей отсылки «расклады — `/menu`»; callback пресета — **тихий** `answerCbQuery` и одно подтверждение в чате.

### Docs

- [docs/ROADMAP.md](docs/ROADMAP.md), [docs/DEPLOY.md](docs/DEPLOY.md).

## [2.3.0] — 2026-04-23

Минорный релиз: **любое локальное время** ежедневной рассылки в формате **`ЧЧ:ММ`** (`/pushtime 14:30`); быстрые кнопки в чате сохранены.

### Added

- Аргумент команды **`/pushtime ЧЧ:ММ`** (00:00–23:59) при активной подписке; при ошибке формата — подсказка и снова клавиатура пресетов.

### Changed

- **`DAY_PUSH_DEFAULT_HHMM`**: любое валидное время из env используется как есть (без привязки к пресетам).
- **`setDayPushLocalHhmmSync`** / **`normalizeDayPushHhmm`**: канонический `HH:MM` в базе; пресеты — только удобные ярлыки в UI.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md), [docs/ROADMAP.md](docs/ROADMAP.md), [.env.example](.env.example).

## [2.2.0] — 2026-04-23

Минорный релиз: **выбор времени рассылки** пресетами и **`/pushtime`**, **`/last`** в **SQLite** (переживает перезапуск).

### Added

- Таблица **`last_readings`** в SQLite: последний сырой текст толкования для **`/last`** (как и раньше, без имени и промпта в этой строке).
- Пресеты времени рассылки **07:00–12:00, 18:00, 21:00**; callback **`pt:HH:MM`**; команда **`/pushtime`** и второе сообщение после включения подписки с кнопками выбора.
- **`setDayPushLocalHhmmSync`** в `usersRepo`: смена `day_push_local_hhmm` только при активной подписке и значении из пресетов.
- Модуль **`dayPushPresets.ts`**: допустимые часы; **`snapDayPushHhmmToPreset`** для `DAY_PUSH_DEFAULT_HHMM`, если в env указано не из пресетов.

### Changed

- **`getDefaultDayPushHhmm`**: значение из env приводится к ближайшему пресету.
- Копирайт **`/help`**, **`LAST_EMPTY_MESSAGE`**, ответ после подписки — в соответствии с хранением `/last` и выбором времени.

### Docs

- [docs/PRIVACY.md](docs/PRIVACY.md), [docs/DEPLOY.md](docs/DEPLOY.md), [docs/BOTFATHER.md](docs/BOTFATHER.md), [docs/ROADMAP.md](docs/ROADMAP.md), [.env.example](.env.example).

### Оператору (вручную)

- В [@BotFather](https://t.me/BotFather) → **Edit Commands**: добавьте **`pushtime`** (см. [docs/BOTFATHER.md](docs/BOTFATHER.md)).

## [2.1.0] — 2026-04-23

Минорный релиз: **ясность суток и времени**, команда **`/status`**, ответы при «лишних» нажатиях, дружелюбнее ошибки и подсказки после расклада.

### Added

- Команда **`/status`**: что доступно (открытый режим или только «на день»), лимит суток **в тех же словах**, что и в остальном боте, строка про **Premium** (если активен), про **рассылку** с ориентиром по времени (из БД после включения подписки).
- Модуль **`calendarDayUserPhrases.ts`**: человекочитаемые формулировки для известных IANA-поясов и нейтральный fallback **без вывода сырого имени пояса** в чат.
- Подсказка после успешного расклада **«три карты»**; короткие ответы при **debounce** и при **параллельном** запросе «На день».

### Changed

- **`/help`**, **`/start`** / **`/menu`** (лимит), **`accessDeniedMessage`**, **`dayLimitMessage`**: текст зависит от настроенного для суток карты дня пояса (Москва и несколько городов РФ — по имени; иначе нейтральная формулировка).
- После **включения подписки** на карту дня — сообщение с **ориентиром по времени** (`~чч:мм` и пояс словами).
- При ошибке ИИ **после уже показанной карты** «на день» — отдельное пояснение, что картинка уже есть и сутки не «сжигаются».
- **`LAST_EMPTY_MESSAGE`**: напоминание **переслать** разбор себе, если нужно надолго.

### Docs

- [docs/BOTFATHER.md](docs/BOTFATHER.md), [docs/DEPLOY.md](docs/DEPLOY.md): команда **`status`**; [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md): отсылка к фразам про сутки; [docs/ROADMAP.md](docs/ROADMAP.md): актуальная версия и блок планов после 2.0.

### Оператору (вручную)

- В [@BotFather](https://t.me/BotFather) → **Edit Commands**: добавьте **`status`** (см. [docs/BOTFATHER.md](docs/BOTFATHER.md)).

## [2.0.3] — 2026-04-23

### Changed

- **Копирайт:** единый стиль **на «ты»** во всех пользовательских сообщениях из `botCopy.ts`, согласованы формулировки лимита, доступа, промокодов, ожидания и ошибок ИИ; повторяющиеся фразы вынесены в константы (`READING_BUILDING_MESSAGE`, `AI_TEXT_UNAVAILABLE_MESSAGE` и др.).
- **Документация:** [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md), [docs/BOTFATHER.md](docs/BOTFATHER.md), [docs/DEPLOY.md](docs/DEPLOY.md), [docs/PRIVACY.md](docs/PRIVACY.md) — в духе тех же формулировок (без противоречий с чатом).

## [2.0.2] — 2026-04-23

### Changed

- **Первое «на день» в жизни пользователя:** после толкования показывается короткий футер с объяснением и **одна** кнопка «Присылать каждый день»; полная клавиатура — снова через `/menu` (или после включения/отключения подписки, как и раньше).
- **Тексты подписки и справки:** убраны из пользовательских сообщений имена переменных окружения и прочая внутренняя кухня; `/help`, отказ в доступе и пустой `/last` сформулированы нейтральнее.

## [2.0.1] — 2026-04-23

### Fixed

- **Подписка «карта дня»:** при ошибке Workers AI cron больше не шлёт каждую минуту новую картинку и интро — для push сначала запрашивается толкование, затем карта и текст; при сбое ИИ пользователь получает одно пояснение, день отмечается обработанным (без долбления API).
- **`/last`:** в памяти хранится сырой текст ответа модели; нарезка на части по лимиту Telegram выполняется до HTML-разметки, чтобы не рвать теги `<b>` у меток разделов.

## [2.0.0] — 2026-04-23

Мажорный релиз: **SQLite** для лимита «карта дня», пользователей (Premium, админы), **одноразовых промокодов**; **ежедневная подписка** на карту дня с планировщиком; доступ к раскладу «три карты» для Premium/админов при активном whitelist.

### Added

- Файл БД по умолчанию **`data/vodovorot.db`** (переменная **`DATABASE_PATH`**); таблицы `users`, `day_draw_slots`, `promo_codes`.
- **`ADMIN_TELEGRAM_USER_IDS`** — выдача флага админа в БД при старте (формат списка как у whitelist).
- Команда **`/promo КОД`** — активация промокода (глобально одноразового); дни Premium задаются в строке кода в БД.
- Подписка на **автоматическую «карту дня»**: кнопки «Присылать каждый день» / «Отписаться от ежедневной карты»; планировщик **раз в минуту**; локальное время отправки по умолчанию **`09:00`** (переменная **`DAY_PUSH_DEFAULT_HHMM`**, формат `HH:MM`); при включении подписки часовой пояс строки — **`DAY_DRAW_TIMEZONE`** (как у лимита суток).
- Миграция **legacy** `day-draw-state.json` → `day_draw_slots` при первом старте, если таблица пуста.

### Changed

- Лимит «карта дня» хранится в **SQLite**, не в JSON (путь `DAY_DRAW_STATE_PATH` используется только для **однократного** импорта).
- При активном **`ALLOWED_TELEGRAM_USER_IDS`** полный доступ к раскладу «прошлое — настоящее — будущее» также у пользователей с **активным Premium** (`premium_until`) или **админов** из БД.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md): фактический прод-хост не фиксируется в репозитории; раздел **«Админы»** (`ADMIN_TELEGRAM_USER_IDS` и SQLite).
- [README.md](README.md): пояснение про хостинг и ссылка на DEPLOY.

### Оператору (обязательно при обновлении с 1.x)

- Смонтировать **том** на каталог с БД (например `./data` или путь из `DATABASE_PATH`); без тома данные слотов и подписок пропадут при пересборке контейнера.
- Добавить промокоды вручную в SQLite (см. [docs/DEPLOY.md](docs/DEPLOY.md)); в BotFather — команду **`promo`**.

## [1.10.0] — 2026-04-23

Минорный релиз: устойчивее русский в толкованиях за счёт модели по умолчанию, промпта и температуры; документация по выбору модели.

### Changed

- **ИИ:** модель по умолчанию **`@cf/meta/llama-3.1-8b-instruct`** (Llama 3.1, мультиязычный instruct вместо Llama 3 8B); **`temperature` 0.85 → 0.72** для меньшего разброса формулировок и вкраплений не-русского.
- **Промпты** (`SYSTEM_PROMPT` в `ai.ts`, `LANGUAGE_HINT` в `prompts.ts`): явная норма русского, запрет латиницы в обычном тексте и «переводного» порядка слов.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md): дефолтная модель и примеры апгрейда качества (`llama-4-scout`, Mistral Small 3.1); [.env.example](.env.example), [docs/GLOSSARY.md](docs/GLOSSARY.md) — согласованы с новым дефолтом.

### Оператору (по желанию)

- Для **максимального** качества русского при готовности к большей цене/латентности задайте `CLOUDFLARE_AI_MODEL=@cf/mistralai/mistral-small-3.1-24b-instruct` или `@cf/meta/llama-4-scout-17b-16e-instruct` — см. [каталог Workers AI](https://developers.cloudflare.com/workers-ai/models/).

## [1.9.0] — 2026-04-09

Минорные изменения по [roadmap](docs/ROADMAP.md) v1.5.0–v1.9.0: лимит дня по Москве, слот после ИИ, промпты, логи ИИ, клавиатура после ответа, `/last`, документация.

### Added

- Календарная дата лимита «карта дня» в **`Europe/Moscow`** (или **`DAY_DRAW_TIMEZONE`**), функции `moscowCalendarDate`, `hasDayDrawSlotUsed`, тесты границы суток.
- Команда **`/last`**: повтор последнего толкования из памяти процесса (`lastReadingStore.ts`, TTL ~24 ч, лимит длины текста).
- Тихие ответы на **просроченные callback** (`answerCbQuerySafe`).

### Changed

- Слот «карта дня» **резервируется после успешной** генерации и отправки толкования; **debounce** 2.5 с и блокировка параллельного `day` на одного пользователя.
- После последнего фрагмента толкования снова отправляется **inline-клавиатура** (`day` / `spread`).
- **Промпты** (`ai.ts`, `prompts.ts`, `brandFormat.ts`): единый тон для новичка и опытного читателя; финальный абзац «размышление ≠ приговор»; усилен нейтральный намёк на перевёрнутую карту.
- **ИИ:** префиксы логов **`[ai_success]`** / **`[ai_error]`**; в пользовательские сообщения не попадают URL и тело ответа API; таймаут обрабатывается отдельно от прочих сетевых ошибок.

### Docs

- [docs/DEPLOY.md](docs/DEPLOY.md): Москва, слот после успеха ИИ, `DAY_DRAW_TIMEZONE`, volatile-память `/last`, таблица команд BotFather.
- [docs/BOTFATHER.md](docs/BOTFATHER.md), [.env.example](.env.example), [docs/PRIVACY.md](docs/PRIVACY.md): Москва, команда `last`.

### Оператору (вручную)

- В [@BotFather](https://t.me/BotFather) → **Edit Commands**: добавьте **`last`** (см. DEPLOY / BOTFATHER).

## [1.4.2] — 2026-04-09

Патч: переработка текстов BotFather и PRIVACY в сухом фактическом стиле.

### Changed

- [docs/BOTFATHER.md](docs/BOTFATHER.md): About, Description и команды — короче, без оценочных формулировок; указаны UTC и Cloudflare Workers AI.
- [docs/PRIVACY.md](docs/PRIVACY.md): структура по пунктам, убраны разговорные обороты.
- [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md): уточнение про деловой тон полей BotFather.

## [1.4.1] — 2026-04-09

Патч: документация для настроек бота в BotFather и политика конфиденциальности.

### Added

- [docs/BOTFATHER.md](docs/BOTFATHER.md) — готовые тексты **About** (120 симв.), **Description** (≤512), список команд, URL для **Privacy Policy**.
- [docs/PRIVACY.md](docs/PRIVACY.md) — текст политики конфиденциальности (Telegram, Cloudflare AI, файл лимита «карта дня»); плейсхолдер контакта оператора.

### Changed

- [docs/BRAND-GUIDE.md](docs/BRAND-GUIDE.md): ссылки на `botCopy`, BotFather и PRIVACY; [README.md](README.md) — ссылка на BOTFATHER.

## [1.4.0] — 2026-04-09

Минорный релиз по [roadmap v1.4.0](docs/ROADMAP.md): только личка, `/help`, единый копирайт, индикатор набора текста.

### Added

- Команда **`/help`**: справка по командам, раскладам, лимиту «на день», дисклеймер; учёт whitelist.
- Модули **`botCopy.ts`** (тексты) и **`typingIndicator.ts`**: периодический `sendChatAction(typing)` на время запроса к Cloudflare AI в раскладах day/spread.
- Тесты для **`isPublicEntryCommand`** (`botCopy.test.ts`).

### Changed

- **Только private-чаты:** middleware отбрасывает обновления из групп и каналов без ответов.
- Тексты `/start` и `/menu` вынесены в `botCopy.ts` и согласованы по смыслу со справкой.

### Оператору (вручную)

- В [@BotFather](https://t.me/BotFather) → **Edit Bot** → **Commands**: добавьте `help` — описание, например: «Справка по боту».

## [1.3.0] — 2026-04-09

Публичная **карта дня** при активном whitelist и суточный лимит для всех.

### Added

- Не в whitelist: доступны `/start`, `/menu` и только расклад **«На день»**; расклад «прошлое — настоящее — будущее» — только у приглашённых id.
- **Лимит 1× за календарные сутки UTC** на пользователя для «карты дня» у всех; состояние в JSON (по умолчанию `data/day-draw-state.json`), опция **`DAY_DRAW_STATE_PATH`**.
- Модуль `dayDrawState.ts`, тесты; `hasFullBotAccess` в `accessWhitelist.ts`; каталог `data/` с `.gitkeep`.

### Changed

- Тексты `/start` и `/menu` и клавиатура зависят от полного доступа; сообщение при отказе в spread обновлено.

### Оператору (вручную)

- Для стабильного лимита в проде: том на `data/` + при миграции с 1.x — `DAY_DRAW_STATE_PATH` — см. `docs/DEPLOY.md`.

## [1.2.0] — 2026-04-09

Опциональный whitelist по Telegram **user id** для закрытого тестирования (минорная функция).

### Added

- Переменная окружения **`ALLOWED_TELEGRAM_USER_IDS`**: если задана непустая строка, бот обрабатывает только перечисленные id; иначе поведение как раньше (доступ для всех).
- Middleware в `bot.ts`: для чужих пользователей — короткий ответ на сообщения и снятие «спиннера» у inline-кнопок.
- Валидация списка при старте; модуль `accessWhitelist.ts` и тесты.
- Документация: `docs/DEPLOY.md` (чеклист вручную), `.env.example`.

### Оператору (вручную после деплоя)

1. Узнать числовой user id тестировщиков (например @userinfobot).
2. Задать `ALLOWED_TELEGRAM_USER_IDS` в `.env` локально и в `.env` на сервере, перезапустить контейнер.
3. Проверить доступ с разрешённого и чужого аккаунта; для открытого доступа позже — убрать переменную или оставить пустой.

## [1.1.0] — 2026-04-09

Минорный релиз: усиление валидации входных данных и сетевых вызовов, аккуратнее логи.

### Security

- Пути к JPEG карт: `cardId` только в диапазоне колоды (`isValidCardId` / `RangeError` в `cardJPEGPath`), исключение произвольных имён файлов.
- Cloudflare Workers AI: проверка формата `CLOUDFLARE_ACCOUNT_ID` (32 hex) и `CLOUDFLARE_AI_MODEL` (безопасное имя модели в пути URL); таймаут HTTP-запроса к API (120 с).
- Скрипт `download-cards`: загрузка изображений только с хостов `*.wikimedia.org` по HTTPS.

### Changed

- Обработчики бота логируют ошибки ИИ без полного `console.error` объекта (имя, сообщение, причина).

## [1.0.0] — 2026-04-09

Первая зафиксированная версия после PoC (текущее состояние бота).

[Unreleased]: https://github.com/findscode/vodovorot-bot/compare/v2.6.2...HEAD
[2.6.2]: https://github.com/findscode/vodovorot-bot/compare/v2.6.1...v2.6.2
[2.6.1]: https://github.com/findscode/vodovorot-bot/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/findscode/vodovorot-bot/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/findscode/vodovorot-bot/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/findscode/vodovorot-bot/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/findscode/vodovorot-bot/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/findscode/vodovorot-bot/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/findscode/vodovorot-bot/compare/v2.0.3...v2.1.0
[2.0.3]: https://github.com/findscode/vodovorot-bot/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/findscode/vodovorot-bot/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/findscode/vodovorot-bot/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/findscode/vodovorot-bot/compare/v1.10.0...v2.0.0
[1.10.0]: https://github.com/findscode/vodovorot-bot/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/findscode/vodovorot-bot/compare/v1.4.2...v1.9.0
[1.4.2]: https://github.com/findscode/vodovorot-bot/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/findscode/vodovorot-bot/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/findscode/vodovorot-bot/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/findscode/vodovorot-bot/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/findscode/vodovorot-bot/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/findscode/vodovorot-bot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/findscode/vodovorot-bot/releases/tag/v1.0.0
