# Changelog

Этот файл фиксирует изменения по этапам. После каждого заметного изменения агент должен добавлять сюда запись.

## 2026-05-23

### Nano Banana service skeleton

#### Что изменено

- Добавлен `src/lib/ai/prompts/nano-banana.ts` с первыми prompt presets для composition stage.
- Добавлен `src/lib/ai/pipeline/hybrid.ts` с безопасным service-каркасом Nano Banana composition stage.
- Из `scratch/` перенесена только архитектурная идея: reference images, prompt, `image_input`, `aspect_ratio` и `output_format`.
- Не перенесены ручное чтение `.env.local`, конкретные ID фотосессий, прямые записи в Supabase/S3 и временные Replicate URL.
- Обновлены `ROADMAP.md`, `docs/AI_GENERATION_PIPELINE.md` и `docs/PROJECT_STRUCTURE.md`.

#### Затронутые файлы

- `src/lib/ai/prompts/nano-banana.ts`
- `src/lib/ai/pipeline/hybrid.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `docs/PROJECT_STRUCTURE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это переводит локальный Nano Banana proof-of-concept в контролируемую структуру проекта. Production generation пока не меняется, но теперь есть безопасное место, где можно развивать `hybrid-v1` маленькими шагами.

### AI pipeline feature flag

#### Что изменено

- В `src/lib/env.ts` добавлен `getAiPipelineMode()`.
- Добавлена переменная `AI_PIPELINE_MODE` в `.env.example`.
- Зафиксированы допустимые режимы: `legacy-lora-v1` и `hybrid-v1`.
- Значение по умолчанию остаётся `legacy-lora-v1`.
- Production generation не переключалась на hybrid pipeline.
- Обновлены `ROADMAP.md`, `docs/ENV_GUIDE.md` и `docs/AI_GENERATION_PIPELINE.md`.

#### Затронутые файлы

- `src/lib/env.ts`
- `.env.example`
- `docs/ENV_GUIDE.md`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это безопасный подготовительный шаг для будущего hybrid pipeline. Теперь проект сможет явно различать старый `legacy-lora-v1` и экспериментальный `hybrid-v1`, но случайно не включит новый режим без отдельного тестирования и решения владельца проекта.

### Intermediate candidates storage design

#### Что изменено

- В `docs/AI_GENERATION_PIPELINE.md` добавлен раздел о хранении intermediate candidates.
- Зафиксировано правило: `photoshoots.result_images` хранит только финальные изображения для пользователя.
- Описаны будущие таблицы `generation_jobs` и `generation_candidates`.
- Описаны рекомендуемые S3 prefixes для source, training, intermediate и final artifacts.
- Обновлён `ROADMAP.md`.

#### Затронутые файлы

- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Hybrid pipeline будет создавать много промежуточных изображений. Этот дизайн не меняет production schema, но заранее фиксирует, какие данные считаются промежуточными, а какие можно показывать пользователю как финальный результат.

### AI pipeline types

#### Что изменено

- Добавлен `src/lib/ai/pipeline/types.ts`.
- Описаны базовые типы для pipeline versions, stages, artifacts, candidates, stage results и final results.
- Типы подготовлены для текущего `legacy-lora-v1` и будущего `hybrid-v1`.
- Обновлены `ROADMAP.md`, `docs/AI_GENERATION_PIPELINE.md` и `docs/PROJECT_STRUCTURE.md`.

#### Затронутые файлы

- `src/lib/ai/pipeline/types.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `docs/PROJECT_STRUCTURE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это безопасный подготовительный слой для hybrid pipeline. Production logic не менялась: новые типы пока только фиксируют общий язык для stages, candidates и final results.

### Status polling transition guards

#### Что изменено

- В `src/lib/photoshoots/status.ts` добавлен общий helper `updatePhotoshootStatus`.
- `src/app/api/ai/status/[id]/route.ts` теперь использует правила переходов статусов при синхронизации с Replicate.
- Авто-дописка `completed`, если уже сохранено 3+ изображения, тоже проходит через state machine.
- Обновлён `ROADMAP.md`.

#### Затронутые файлы

- `src/lib/photoshoots/status.ts`
- `src/app/api/ai/status/[id]/route.ts`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Status polling больше не записывает новый статус напрямую. Теперь он уважает те же правила переходов, что training и generation webhook-и.

### Generation webhook status transition guards

#### Что изменено

- В `src/lib/photoshoots/status.ts` добавлен `updatePhotoshootGenerationStatus`.
- `src/app/api/webhooks/replicate/generation/route.ts` теперь проверяет правила переходов перед обновлением `error`, `generating` и `completed`.
- Прямые update-запросы статуса в generation webhook заменены на общий helper.
- Обновлены `ROADMAP.md` и `docs/AI_GENERATION_PIPELINE.md`.

#### Затронутые файлы

- `src/lib/photoshoots/status.ts`
- `src/app/api/webhooks/replicate/generation/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это продолжает применение state machine. Generation webhook теперь не переводит фотосессию в нелогичный статус и не перезаписывает результат, если текущий статус не допускает такой переход.

### Training webhook status transition guards

#### Что изменено

- `src/lib/photoshoots/status.ts` теперь проверяет текущий статус перед переходом в `error` или `generating`.
- `markPhotoshootTrainingFailed` и `markPhotoshootGenerating` возвращают `true/false`, чтобы webhook понимал, был ли переход применён.
- `src/app/api/webhooks/replicate/training/route.ts` не продолжает запуск generation, если переход в `generating` запрещён правилами статусов.
- Обновлён `ROADMAP.md`.

#### Затронутые файлы

- `src/lib/photoshoots/status.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это первый реальный шаг применения state machine. Training webhook теперь не переводит фотосессию в нелогичный статус и не запускает генерацию, если текущий статус не допускает такой переход.

### Photoshoot status transition rules

#### Что изменено

- В `src/lib/photoshoots/status.ts` добавлены `PHOTOSHOOT_STATUSES`.
- Добавлены `ALLOWED_PHOTOSHOOT_STATUS_TRANSITIONS` с допустимыми переходами между статусами.
- Добавлен helper `canTransitionPhotoshootStatus`.
- Обновлён `ROADMAP.md`.

#### Затронутые файлы

- `src/lib/photoshoots/status.ts`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это подготовительный шаг для state machine фотосессий. Правила уже описаны в одном месте, но пока не блокируют production flow; применять их в webhook/status потоках нужно отдельными маленькими шагами.

### Photoshoot status helpers

#### Что изменено

- Добавлен `src/lib/photoshoots/status.ts`.
- Обновление статуса `error`, переход в `generating` с сохранением `lora_url` и сохранение `generation_id` вынесены из training webhook.
- `src/app/api/webhooks/replicate/training/route.ts` теперь вызывает helper-ы вместо прямых update-запросов Supabase.
- Обновлены `ROADMAP.md`, `docs/PROJECT_STRUCTURE.md` и `docs/AI_GENERATION_PIPELINE.md`.

#### Затронутые файлы

- `src/lib/photoshoots/status.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `docs/PROJECT_STRUCTURE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это продолжает P1 #3: изменения статуса фотосессии вынесены в одно понятное место. Это готовит будущую state machine, где будут явно описаны разрешённые переходы между статусами.

### Legacy LoRA training payload helper

#### Что изменено

- В `src/lib/ai/pipeline/legacy-lora.ts` добавлен `extractLegacyLoraUrlFromTrainingPayload`.
- Извлечение и нормализация `lora_url` из Replicate training payload вынесены из training webhook.
- `src/app/api/webhooks/replicate/training/route.ts` теперь сохраняет уже подготовленную строку `lora_url`.
- Обновлены `ROADMAP.md` и `docs/AI_GENERATION_PIPELINE.md`.

#### Затронутые файлы

- `src/lib/ai/pipeline/legacy-lora.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это продолжает P1 #3: webhook меньше зависит от деталей ответа Replicate, а правила текущего `legacy-lora-v1` лежат рядом с AI pipeline. Поведение сохранено: поддерживается `payload.output.weights`, а если его нет - используется `payload.output`.

### Legacy LoRA prompt input helper

#### Что изменено

- В `src/lib/ai/pipeline/legacy-lora.ts` добавлен `getLegacyLoraPromptsForPhotoshoot`.
- Fallback-значения для стиля, пола, типа тела, цвета глаз и волос вынесены из training webhook.
- `src/app/api/webhooks/replicate/training/route.ts` теперь передаёт данные фотосессии в helper, а не собирает prompt input вручную.
- Обновлены `ROADMAP.md` и `docs/AI_GENERATION_PIPELINE.md`.

#### Затронутые файлы

- `src/lib/ai/pipeline/legacy-lora.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это ещё один безопасный шаг P1 #3: route становится тоньше, а правила подготовки данных для текущего `legacy-lora-v1` лежат рядом с AI pipeline. Prompt-ы, модель и параметры генерации не менялись.

### Legacy LoRA pipeline service

#### Что изменено

- Добавлен `src/lib/ai/pipeline/legacy-lora.ts`.
- Запуск Replicate generation prediction для текущего `legacy-lora-v1` вынесен из training webhook в отдельный service-модуль.
- `src/app/api/webhooks/replicate/training/route.ts` теперь вызывает `startLegacyLoraPredictions`.
- `docs/AI_GENERATION_PIPELINE.md`, `ROADMAP.md` и `docs/PROJECT_STRUCTURE.md` обновлены под новый service-модуль.

#### Затронутые файлы

- `src/lib/ai/pipeline/legacy-lora.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это продолжение P1 #3: webhook становится тоньше, а текущий AI pipeline постепенно оформляется как `legacy-lora-v1`. Модель, prompt-ы, параметры генерации и production flow не менялись.

### Legacy LoRA prompt presets

#### Что изменено

- Добавлен `src/lib/ai/prompts/legacy-lora.ts`.
- Prompt presets, negative prompt и model id текущего LoRA pipeline вынесены из Replicate training webhook.
- `src/app/api/webhooks/replicate/training/route.ts` теперь получает готовые prompt-ы через `getLegacyLoraPrompts`.
- `docs/AI_GENERATION_PIPELINE.md`, `ROADMAP.md` и `docs/PROJECT_STRUCTURE.md` обновлены под новый модуль.

#### Затронутые файлы

- `src/lib/ai/prompts/legacy-lora.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Это первый безопасный шаг P1 #3: текущий pipeline оформляется как `legacy-lora-v1`, а webhook постепенно освобождается от prompt-логики. Модель, параметры генерации и production flow не менялись.

### Hybrid AI generation pipeline design

#### Что изменено

- Проанализированы production-файлы AI training/generation и локальные `scratch`-эксперименты с Nano Banana / hybrid.
- Создан `docs/AI_GENERATION_PIPELINE.md`.
- В документе описаны текущий production pipeline, проблемы качества и целевая hybrid-архитектура.
- `ROADMAP.md` обновлён задачами по внедрению hybrid generation pipeline.
- `docs/PROJECT_STRUCTURE.md` обновлён ссылкой на новый AI-документ.

#### Затронутые файлы

- `docs/AI_GENERATION_PIPELINE.md`
- `ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Качество генерации — ключевая часть продукта. Новый документ фиксирует безопасный план: сначала сохранить текущий pipeline как `legacy-lora-v1`, затем готовить `hybrid-v1`, где Flux LoRA отвечает за identity, Nano Banana — за композицию, а финальные этапы отвечают за face integration и upscale.

### Supabase database types

#### Что изменено

- Добавлен `src/types/database.ts` с типами текущей таблицы `photoshoots`.
- Supabase server, browser и middleware clients подключены к типу `Database`.
- Service-role Supabase clients в Replicate webhook-ах тоже получили тип `Database`.
- Исправлена типизация статуса в `api/ai/status/[id]`.
- Добавлена безопасная нормализация `gender` при создании фотосессии.
- Обновлены `ROADMAP.md` и `docs/PROJECT_STRUCTURE.md`.

#### Затронутые файлы

- `src/types/database.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`
- `src/utils/supabase/client.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `src/app/api/webhooks/replicate/generation/route.ts`
- `src/app/api/ai/status/[id]/route.ts`
- `src/app/dashboard/new/actions.ts`
- `ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Теперь TypeScript знает структуру таблицы `photoshoots` и может заранее ловить ошибки в полях, статусах и insert/update-операциях. Это снижает риск тихо сломать работу базы при следующих изменениях.

### Centralized env access

#### Что изменено

- Добавлен `src/lib/env.ts` для серверных env-переменных.
- Добавлен `src/lib/public-env.ts` для публичных `NEXT_PUBLIC_*` переменных.
- Убрано ручное чтение `.env.local` из активного `src`.
- AI training/generation, Replicate webhook-и, S3, Supabase server helpers, upload API и result page переведены на env-helper-файлы.
- Обновлены `ROADMAP.md`, `docs/ENV_GUIDE.md` и `docs/PROJECT_STRUCTURE.md`.

#### Затронутые файлы

- `src/lib/env.ts`
- `src/lib/public-env.ts`
- `src/lib/ai/training.ts`
- `src/lib/ai/generation.ts`
- `src/lib/s3.ts`
- `src/app/api/webhooks/replicate/training/route.ts`
- `src/app/api/webhooks/replicate/generation/route.ts`
- `src/app/api/ai/status/[id]/route.ts`
- `src/app/api/upload/presigned/route.ts`
- `src/app/dashboard/result/[id]/page.tsx`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`
- `src/utils/supabase/client.ts`
- `src/components/YandexMetrica.tsx`
- `ROADMAP.md`
- `docs/ENV_GUIDE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Раньше часть серверного кода вручную открывала `.env.local`, что усложняло безопасность и поддержку. Теперь env читается централизованно через helper-файлы: реальные значения не выводятся в логи, приватные и публичные переменные разделены.

### Roadmap rewritten in Russian

#### Что изменено

- `ROADMAP.md` полностью переписан на русский язык.
- Сохранены текущие приоритеты, выполненные P0-задачи и следующий шаг P1 #1.
- Формулировки сделаны проще для владельца проекта без потери технического смысла.

#### Затронутые файлы

- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Владелец проекта не является разработчиком, поэтому основной план работ должен быть понятным без перевода и без лишней технической плотности.

### Scratch script isolation

#### What changed

- Added `scratch/README.md` with safety rules for local operational scripts.
- Updated `.gitignore` so real `scratch/` scripts stay local-only while `scratch/README.md` can be tracked.
- Updated project structure docs to explain that only the README is safe to publish.
- Marked P0 #9 as done in `ROADMAP.md`.

#### Files touched

- `.gitignore`
- `scratch/README.md`
- `docs/PROJECT_STRUCTURE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Why

The `scratch/` folder contains scripts that can use service-role access, call Replicate, write to S3, update database rows, or delete data. The project now has a clear warning in the folder itself without exposing the real local scripts.

### Generation webhook idempotency

#### What changed

- The Replicate generation webhook now reads generated image URLs through a typed payload helper.
- Generated S3 object keys are stable for the same Replicate prediction/image index.
- Saved result image keys are deduplicated before updating the `photoshoots` record.
- Failed or canceled callbacks no longer automatically erase partial progress if generated images already exist.
- `ROADMAP.md` now marks P0 #8 as done and points to the next P0 task.

#### Files touched

- `src/app/api/webhooks/replicate/generation/route.ts`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Why

Replicate can deliver webhook callbacks more than once. Before this change, the same callback could add duplicate result images or move a partly successful session straight to `error`. This pass makes the existing flow safer without changing the wider architecture.

### Database schema reconciliation

#### Что изменено

- `supabase_schema.sql` стал главным и актуальным SQL-файлом для таблицы `photoshoots`.
- `supabase_photoshoots_table.sql` оставлен как старый совместимый файл-подсказка, но больше не задаёт отдельную схему.
- В структуре проекта отмечено, какой SQL-файл использовать.
- В roadmap отмечено выполнение P0-задачи по схеме базы данных.

#### Затронутые файлы

- `supabase_schema.sql`
- `supabase_photoshoots_table.sql`
- `docs/PROJECT_STRUCTURE.md`
- `ROADMAP.md`
- `docs/CHANGELOG.md`

#### Зачем это сделано

Раньше в проекте было два SQL-файла с разными версиями таблицы `photoshoots`. Это опасно: можно случайно создать базу не той структуры. Теперь есть один главный файл, а старый файл оставлен только как указатель.

### Что изменено

- Создана базовая система документации для владельца проекта.
- Добавлены документы о структуре проекта, запуске и правилах для владельца.
- Обновлён README, чтобы он был понятен не только разработчику.
- Обновлён ENV guide без реальных секретов.
- Зафиксировано правило: после изменений обновлять ROADMAP и CHANGELOG.

### Затронутые файлы

- `README.md`
- `ROADMAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/SETUP_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/ENV_GUIDE.md`
- `docs/NON_TECH_OWNER_GUIDE.md`

### Зачем это сделано

Владелец проекта не является разработчиком. Документация помогает понять, где что находится, как запускать проект, как проверять работу агента и какие файлы нельзя трогать.
