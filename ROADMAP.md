# Roadmap PhotoGen

Последнее обновление: 2026-05-23

## Текущее состояние

PhotoGen — это приложение на Next.js 16 App Router для AI-фотосессий.

Основной путь пользователя:

1. Пользователь входит в аккаунт через Supabase Auth.
2. Пользователь загружает 10-25 исходных фотографий напрямую в S3 через временную ссылку.
3. Приложение создаёт запись `photoshoots` со стилем и параметрами внешности.
4. Тестовая оплата переводит заказ из `pending` в `training`.
5. Сервер собирает загруженные фото в ZIP-датасет и запускает обучение LoRA в Replicate.
6. Webhook Replicate после обучения запускает генерацию изображений.
7. Webhook Replicate после генерации скачивает готовые изображения, сохраняет их в S3 и обновляет Supabase.
8. Пользователь видит готовый результат в личном кабинете.

## Что уже сделано

- Главная страница с hero-блоком, примерами, ценами, отзывами, FAQ и финальным призывом.
- Авторизация через Supabase: email/password и UI для Telegram, Google, VK, Yandex.
- Защищённые страницы личного кабинета через Supabase SSR proxy.
- Мастер создания фотосессии: загрузка файлов, анкета внешности, выбор стиля.
- API для прямой загрузки фото в S3 через presigned URL.
- Тестовый маршрут оплаты, который запускает обучение.
- Интеграция Replicate LoRA training на основе загруженных фото.
- Webhook-и Replicate для статусов обучения и генерации.
- Сохранение сгенерированных изображений в S3.
- Опрос статуса и прогресс в личном кабинете.
- Интеграция Yandex Metrica и целей signup/create.
- Базовая документация для владельца проекта.
- Безопасный шаблон `.env.example` без секретов.
- `.gitignore` защищает реальные env-файлы от попадания в Git.
- Добавлены `src/lib/env.ts` и `src/lib/public-env.ts` для централизованной работы с env без чтения `.env.local` вручную.
- Добавлены базовые TypeScript-типы Supabase в `src/types/database.ts`.
- `supabase_schema.sql` выбран как главный SQL-файл схемы базы данных.
- Generation webhook стал устойчивее к повторной доставке webhook-ов.
- Папка `scratch/` задокументирована как локальная зона опасных отладочных скриптов.
- Спроектирован целевой hybrid AI generation pipeline: Flux LoRA для identity, Nano Banana для композиции, face integration и final upscale.
- Начато P1 #3: prompt-ы текущего `legacy-lora-v1`, подготовка prompt input, извлечение LoRA URL, запуск Replicate generation, update-helper-ы фотосессий, правила переходов статусов и базовые pipeline types вынесены в `src/lib`.
- Продолжено P1 #3: Nano Banana proof-of-concept перенесён в безопасный service-каркас без подключения к production generation.

## Что не доделано

- Реальная платёжная система пока не подключена, оплата работает как mock.
- Нет полноценной системы миграций базы данных.
- Выполнено: добавлены TypeScript-типы для текущей схемы Supabase `photoshoots`.
- Нет автоматических тестов для авторизации, загрузки, webhook-ов и переходов статуса.
- AI-логика пока разделена между API route handlers и `src/lib`, но чтение env уже вынесено в общие helper-файлы.
- Экран результата и скачивания пока базовый, часть стилей написана inline.
- В `scratch/` остаётся много локальных рабочих скриптов с жёстко заданными ID. Они изолированы от Git, но требуют будущей уборки.

## Найденные ошибки и риски

- Исправлено: `eslint` в `next.config.ts` больше не используется, потому что Next.js 16 это не поддерживает.
- Исправлено: старый `middleware.ts` заменён на совместимый с Next.js 16 `src/proxy.ts`.
- Исправлено: текущая сборка больше не воспроизводит ошибки импорта CSS modules.
- Проверено: русские тексты в исходных файлах валидны в UTF-8. Если PowerShell показывает нечитаемые символы, это проблема отображения консоли.
- Исправлено: SQL-файлы больше не задают две конкурирующие версии таблицы `photoshoots`.
- Исправлено частично: generation webhook удаляет дубли result image keys и использует стабильные S3-ключи.
- Остался риск: часть webhook/status логики всё ещё использует случайную задержку вместо атомарного обновления в базе.
- `generation.ts` выглядит как старый или альтернативный путь генерации; нужно отдельно подтвердить, используется ли он в реальном сценарии.
- Текущий production pipeline использует LoRA/FLUX generation как основной путь; Nano Banana и hybrid-подход пока существуют только в `scratch/` как локальные эксперименты.
- Build config всё ещё содержит `ignoreBuildErrors: true`, поэтому это нужно убрать после укрепления типов.

## Технический долг

- Выполнено: ручное чтение `REPLICATE_API_TOKEN` из `.env.local` убрано из активного `src`.
- Выполнено: Supabase clients подключены к типу `Database`; insert/update для `photoshoots` теперь проверяются TypeScript.
- Осталось: постепенно перевести новые будущие интеграции на `src/lib/env.ts` и `src/lib/public-env.ts`, не возвращая прямое чтение env в бизнес-логику.
- Выполнено частично: prompt-ы текущего LoRA pipeline, fallback-значения анкеты, извлечение `lora_url`, запуск Replicate generation, update-helper-ы фотосессий и список разрешённых переходов статусов вынесены из route-файла.
- Выполнено: правила переходов статусов применены в training webhook, generation webhook и status polling.
- Server/client обязанности местами смешаны.
- Некоторые auth-потоки существуют и как server actions, и как client-код.
- Много страниц dashboard используют inline styles вместо CSS modules.
- В критичных местах ещё встречается `any`.
- Выполнено: добавлен `src/lib/photoshoots/status.ts` с helper-ами обновления статусов и явными правилами переходов; правила применены в training webhook, generation webhook и status polling.
- Webhook авторизуется через общий секрет в query params.
- Нет cleanup job для временных исходных фото и ZIP-архивов, хотя UI обещает удаление.
- Документацию нужно обновлять после каждого заметного изменения: `ROADMAP.md`, `docs/CHANGELOG.md` и профильные docs.

## UX/UI улучшения

- Ясно показать ограничения загрузки: форматы, размер, минимум/максимум фото, ошибки по каждому файлу.
- Добавить повторную загрузку для отдельных неудачных файлов.
- Удалять S3-ключи, если пользователь удаляет файл из UI до создания фотосессии.
- Заменить `alert()` на понятные inline-ошибки и toast-уведомления.
- Улучшить карточки статуса: `pending`, `payment`, `training`, `generating`, `error`, `completed`.
- Перенести inline styles со страниц оплаты и результата в CSS modules.
- Добавить понятные пустые и ошибочные состояния при провале генерации.
- Улучшить мобильную верстку и перенос текста в кнопках.

## Производительность

- Не создавать повторно `URL.createObjectURL` на каждом render загрузки.
- Где уместно, использовать `next/image` или контролируемую загрузку изображений.
- Снизить количество client-side auth-запросов в `Navbar`.
- Не опрашивать Replicate отдельно для каждой карточки dashboard при большом количестве заказов.
- Вынести долгие AI-задачи из request lifecycle в очередь или worker.
- Добавить проверку размера и возможное сжатие изображений перед загрузкой.

## SEO

- Расширить metadata страниц.
- Добавить Open Graph и Twitter card metadata с подходящими изображениями.
- Добавить canonical URL на основе `NEXT_PUBLIC_SITE_URL`.
- Добавить structured data для продукта/услуги и FAQ, если публичный контент сохраняется.
- Добавить robots/sitemap, если они нигде не генерируются.

## Accessibility

- Добавить заметные focus states там, где их нет.
- Добавить осмысленный alt text для контентных и результатных изображений.
- Проверить icon-only кнопки на наличие accessible labels.
- Заменить `alert()` на доступные inline-ошибки.
- Улучшить управление с клавиатуры для style cards, sliders, modal previews и upload controls.
- Учитывать `prefers-reduced-motion` для анимаций.
- Проверить контраст amber-on-dark и muted text.

## Архитектурные улучшения

- Выполнено: создан `src/lib/env.ts` для серверных env и `src/lib/public-env.ts` для публичных browser-safe env.
- Выполнено: добавлены TypeScript-типы базы Supabase для текущей таблицы `photoshoots`.
- Выполнено: создан `docs/AI_GENERATION_PIPELINE.md` с текущим и целевым AI pipeline.
- Выполнено частично: создан `src/lib/photoshoots/status.ts` с базовыми helper-ами обновления статусов и явными разрешёнными переходами. Следующий шаг - применять правила в webhook/status потоках.
- Вынести AI-оркестрацию в сервисы:
  - упаковка training dataset;
  - запуск обучения;
  - запуск генерации;
  - сохранение webhook-результатов;
  - prompt templates.
- Перейти от отдельных SQL-файлов к понятной системе миграций.
- Перенести полезные operational scripts из `scratch/` в документированную `scripts/`-зону или удалить устаревшее после подтверждения владельца.
- Добавить idempotency для webhook-ов и будущих payment events.
- Добавить тесты вокруг основной state machine.

## Качество AI-генерации

Целевая схема качества:

1. Flux LoRA через Replicate отвечает только за identity: лицо, узнаваемость, персональные черты.
2. Nano Banana отвечает за композицию: тело, одежду, позу, фон, кадрирование и настроение.
3. Face-swap, inpainting или LoRA img2img объединяет identity и композицию.
4. Финальный upscale/enhancement улучшает резкость, детализацию и общее качество.

Задачи внедрения:

- Выполнено частично: текущая генерация оформляется как `legacy-lora-v1`.
- Выполнено: prompt-ы вынесены из webhook route в `src/lib/ai/prompts/legacy-lora.ts`.
- Выполнено: запуск legacy LoRA prediction вынесен из webhook route в `src/lib/ai/pipeline/legacy-lora.ts`.
- Выполнено: fallback-подготовка данных фотосессии для prompt-ов вынесена в `getLegacyLoraPromptsForPhotoshoot`.
- Выполнено: извлечение `lora_url` из training webhook payload вынесено в `extractLegacyLoraUrlFromTrainingPayload`.
- Выполнено: обновление статусов `error`, `generating` и сохранение `generation_id` для training webhook вынесены в `src/lib/photoshoots/status.ts`.
- Выполнено: добавлены `PHOTOSHOOT_STATUSES`, `ALLOWED_PHOTOSHOOT_STATUS_TRANSITIONS` и `canTransitionPhotoshootStatus`.
- Выполнено: training webhook использует правила переходов перед переводом фотосессии в `error` или `generating`.
- Выполнено: generation webhook использует правила переходов перед переводом фотосессии в `error`, `generating` или `completed`.
- Выполнено: status polling использует правила переходов перед синхронизацией статуса из Replicate и авто-дописыванием `completed`.
- Выполнено: добавлены базовые типы pipeline stage/candidate/result в `src/lib/ai/pipeline/types.ts`.
- Выполнено: спроектировано хранение intermediate candidates отдельно от финальных `result_images` в `docs/AI_GENERATION_PIPELINE.md`.
- Выполнено: добавлен feature flag `AI_PIPELINE_MODE=legacy-lora-v1|hybrid-v1` с безопасным дефолтом `legacy-lora-v1`.
- Выполнено: перенести Nano Banana proof-of-concept из `scratch/` в безопасный service-код без чтения `.env.local`, ручных ID фотосессий и прямой записи результатов в dashboard.
- Добавить face integration stage: face-swap, inpainting или img2img LoRA pass.
- Добавить final upscale/enhancement stage.
- Собрать quality checklist и тестовый набор из 5-10 фотосессий.
- Включать hybrid по умолчанию только после сравнения качества с legacy pipeline.

## Приоритеты

### P0: критичные ошибки и незавершённые базовые функции

1. Выполнено: проверить текущий build/lint/typecheck и исправить блокирующие ошибки.
2. Выполнено: убрать неподдерживаемый `eslint` config из `next.config.ts`.
3. Выполнено: заменить deprecated `middleware.ts` на совместимый с Next.js 16 `proxy.ts`.
4. Выполнено: проверить и закрыть ошибки CSS module imports.
5. Выполнено: вернуть чистый проход `tsc --noEmit`.
6. Выполнено: проверить и закрепить UTF-8 для русских текстов.
7. Выполнено: привести SQL-схему Supabase к одному главному файлу.
8. Выполнено: добавить более безопасную idempotency для generation webhook.
9. Выполнено: задокументировать и изолировать опасные `scratch/`-скрипты.
10. Выполнено: добавить базовую документацию для владельца проекта и правила её ведения.

### P1: важные улучшения UX, архитектуры и качества

1. Выполнено: добавить централизованную безопасную работу с env и убрать дублированное чтение `.env.local`.
2. Выполнено: добавить TypeScript-типы Supabase и заменить широкий `any` в критичных потоках.
3. В работе: вынести оставшуюся AI orchestration из webhook/API routes, оформить `legacy-lora-v1` и подготовить основу для `hybrid-v1`.
4. Улучшить upload validation, inline errors и retry UX.
5. Перенести inline styles dashboard/pay/result в CSS modules.
6. Провести accessibility pass для форм, style cards, modals, sliders и кнопок.
7. Добавить базовые тесты для create photoshoot, upload auth, status polling и webhook-ов.
8. Подготовить дизайн и реализацию реальной платёжной интеграции.

### P2: косметика и nice-to-have

1. Улучшить статистику dashboard и модель баланса пользователя.
2. Добавить действия в result gallery: выбрать, сравнить, скачать всё.
3. Добавить более подробную историю генераций для пользователя.
4. Добавить SEO Open Graph images и structured data.
5. Оптимизировать публичные изображения.
6. Почистить устаревшие комментарии и нормализовать терминологию.

## Порядок выполнения

1. Стабилизировать сборку и совместимость с фреймворком.
2. Исправить кодировку и расхождение SQL-схем.
3. Укрепить основной жизненный цикл: оплата, обучение, генерация, webhook idempotency, retry.
4. Улучшить upload/dashboard/result UX.
5. Добавить typed boundaries, env validation и service extraction.
6. Добавить тесты для критичного жизненного цикла.
7. Отполировать SEO, accessibility и визуальные детали.

## Журнал активной работы

- 2026-05-23: создан roadmap по результатам анализа проекта. Первый фокус: P0 стабилизация build/config.
- 2026-05-23: начата P0 стабилизация: проверены build/lint/typecheck, убран unsupported Next config, middleware заменён на `proxy.ts`, operational `scratch/` исключён из lint.
- 2026-05-23: первый P0-проход завершён. `npm.cmd run build`, `npm.cmd run lint`, `node_modules\.bin\tsc.cmd --noEmit` проходят. Остались только lint warnings.
- 2026-05-23: проверена кодировка. Исходники, SQL и Markdown валидны в UTF-8; добавлен `.editorconfig`.
- 2026-05-23: добавлен безопасный env workflow: env ignores, `.env.example`, `docs/ENV_GUIDE.md`, предупреждение в README. Реальные секреты не выводились и не записывались в docs.
- 2026-05-23: добавлена документация для владельца: структура проекта, setup guide, changelog, non-technical owner guide, README и ENV guide.
- 2026-05-23: завершено согласование SQL-схемы. `supabase_schema.sql` теперь главный файл схемы.
- 2026-05-23: завершён P0-проход по webhook idempotency. Generation results используют стабильные S3-ключи, дубли удаляются, partial progress сохраняется.
- 2026-05-23: завершена изоляция `scratch/`. Реальные debug scripts остаются локальными, `scratch/README.md` описывает правила безопасности.
- 2026-05-23: roadmap полностью переписан на русский язык без изменения текущих приоритетов.
- 2026-05-23: выполнен P1 #1. Добавлены env-helper-файлы, активный `src` больше не читает `.env.local` вручную, серверные и публичные env-разделены.
- 2026-05-23: выполнен P1 #2. Добавлен `src/types/database.ts`, Supabase clients получили тип `Database`, исправлены типы статуса и `gender` при создании фотосессии.
- 2026-05-23: спроектирован hybrid AI generation pipeline и создан `docs/AI_GENERATION_PIPELINE.md`. Production logic не менялась.
- 2026-05-23: начат P1 #3. Prompt presets текущего `legacy-lora-v1` вынесены из training webhook в отдельный модуль без изменения модели и параметров генерации.
- 2026-05-23: продолжен P1 #3. Запуск Replicate prediction для `legacy-lora-v1` вынесен из training webhook в `src/lib/ai/pipeline/legacy-lora.ts`; модель, prompt-ы и параметры генерации не менялись.
- 2026-05-23: продолжен P1 #3. Подготовка prompt input из данных фотосессии вынесена из training webhook в `getLegacyLoraPromptsForPhotoshoot`; fallback-значения сохранены.
- 2026-05-23: продолжен P1 #3. Извлечение и нормализация `lora_url` из Replicate training payload вынесены в `extractLegacyLoraUrlFromTrainingPayload`.
- 2026-05-23: продолжен P1 #3. Обновление статусов training webhook вынесено в `src/lib/photoshoots/status.ts`: `error`, `generating` и сохранение `generation_id`.
- 2026-05-23: продолжен P1 #3. В `src/lib/photoshoots/status.ts` добавлены явные статусы, разрешённые переходы и helper проверки перехода без изменения production flow.
- 2026-05-23: продолжен P1 #3. Training webhook начал применять правила переходов статусов перед обновлением `error` и `generating`.
- 2026-05-23: продолжен P1 #3. Generation webhook начал применять правила переходов статусов перед обновлением `error`, `generating` и `completed`.
- 2026-05-23: продолжен P1 #3. Status polling начал применять правила переходов статусов перед синхронизацией статуса и авто-дописыванием `completed`.
- 2026-05-23: продолжен P1 #3. Добавлен `src/lib/ai/pipeline/types.ts` с базовыми типами stage/candidate/result для `legacy-lora-v1` и будущего `hybrid-v1`.
- 2026-05-23: продолжен P1 #3. В `docs/AI_GENERATION_PIPELINE.md` описано хранение intermediate candidates отдельно от финальных `result_images` без изменения production schema.
- 2026-05-23: продолжен P1 #3. Добавлен безопасный feature flag `AI_PIPELINE_MODE=legacy-lora-v1|hybrid-v1`; по умолчанию остаётся `legacy-lora-v1`, production generation не переключалась.
- 2026-05-23: продолжен P1 #3. Добавлены `src/lib/ai/prompts/nano-banana.ts` и `src/lib/ai/pipeline/hybrid.ts` как безопасный каркас Nano Banana composition stage без подключения к production flow.

## Новые найденные проблемы

- PowerShell может некорректно отображать русские UTF-8 тексты, даже если сами файлы корректны.
- Выполнено: активный код в `src` больше не читает `.env.local` вручную. Реальные значения по-прежнему должны храниться только локально или в приватных настройках сервера.
- Ранее `.env*` скрывал также `.env.example`; исправлено через `!.env.example`.
- В логах сборки раньше выводился префикс Replicate token; исправлено, теперь лог подтверждает загрузку токена без вывода части секрета.

## Следующий шаг

P1 #3: спроектировать face integration stage: выбрать первый безопасный метод между face-swap, inpainting и LoRA img2img, пока без подключения к production flow.
