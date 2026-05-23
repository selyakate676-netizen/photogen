# AI Generation Pipeline

Этот документ описывает текущую AI-генерацию PhotoGen и целевую архитектуру гибридного pipeline.

Важно: документ не меняет production logic. Это план внедрения.

## Текущие production-файлы генерации

- `src/lib/ai/training.ts` - собирает исходные фото из S3 в ZIP, загружает ZIP в S3, запускает Replicate LoRA training через `ostris/flux-dev-lora-trainer`.
- `src/app/api/webhooks/replicate/training/route.ts` - принимает webhook после training, передаёт служебные обновления в photoshoot helper-ы и запускает generation через AI pipeline service.
- `src/lib/ai/prompts/legacy-lora.ts` - содержит prompt presets, negative prompt и model id для текущего `legacy-lora-v1` pipeline.
- `src/lib/ai/prompts/nano-banana.ts` - содержит первые безопасные prompt presets для Nano Banana composition stage будущего `hybrid-v1`.
- `src/lib/ai/pipeline/legacy-lora.ts` - извлекает LoRA URL из training payload, готовит prompt input из данных фотосессии и запускает 4 Replicate generation prediction для текущего `legacy-lora-v1` pipeline.
- `src/lib/ai/pipeline/hybrid.ts` - содержит безопасный service-каркас для Nano Banana composition stage. Сейчас он не подключён к production flow.
- `src/lib/ai/pipeline/types.ts` - общие типы для pipeline versions, stages, candidates, artifacts и final results.
- `src/lib/env.ts` - содержит `getAiPipelineMode()` для безопасного чтения `AI_PIPELINE_MODE`. По умолчанию всегда используется `legacy-lora-v1`; `hybrid-v1` пока не должен включаться без отдельного тестирования.
- `src/lib/photoshoots/status.ts` - описывает статусы, разрешённые переходы, проверяет переходы в training/generation webhook и status polling, обновляет статус фотосессии, `lora_url`, `generation_id` и `result_images`.
- `src/app/api/webhooks/replicate/generation/route.ts` - принимает webhook после generation, скачивает output images, сохраняет их в S3 и обновляет `photoshoots.result_images`.
- `src/app/api/ai/start-training/route.ts` - API entrypoint для старта training flow.
- `src/app/api/ai/status/[id]/route.ts` - проверяет статус фотосессии и при необходимости сверяет training status через Replicate.
- `src/lib/ai/generation.ts` - альтернативный или старый путь генерации через `fofr/instant-id`; сейчас требует отдельного подтверждения, используется ли он в реальном сценарии.

## Локальные экспериментальные файлы

В `scratch/` уже есть полезные, но опасные локальные эксперименты. Они не должны попадать в production без переписывания на безопасную архитектуру.

- `scratch/nano_banana_test.js` - тест Nano Banana с несколькими reference images.
- `scratch/nano_banana_full.js` - генерация нескольких Nano Banana изображений и сохранение результата в dashboard.
- `scratch/hybrid_v4.js` - эксперимент `Nano Banana -> LoRA img2img -> S3`, сравнение strength 0.35 / 0.50 / 0.65.
- `scratch/hybrid_poc_v3b.js` - сравнение img2img strength 0.50 / 0.65.
- `scratch/hybrid_poc*.js` - ранние proof-of-concept варианты hybrid/inpainting.

Эти скрипты читают локальные env и могут менять Supabase/S3. Их нельзя запускать случайно.

Из этих POC в production-код переносится только безопасная архитектурная форма: prompt presets, типы входа и отдельные service-функции. Конкретные ID фотосессий, прямое чтение `.env.local`, ручные записи в Supabase/S3 и временные Replicate URL не переносятся.

## Текущий production pipeline

1. Пользователь загружает исходные фото в S3.
2. `src/lib/ai/training.ts` скачивает эти фото из S3 и собирает ZIP dataset.
3. ZIP dataset загружается обратно в S3.
4. Replicate запускает LoRA training:
   - model: `ostris/flux-dev-lora-trainer`;
   - trigger word: `tok`;
   - результат: LoRA weights URL.
5. Training webhook сохраняет `lora_url` в Supabase.
6. Training webhook готовит prompt-ы и webhook URL.
7. `src/lib/ai/pipeline/legacy-lora.ts` запускает 4 generation jobs на модели `selyakate676-netizen/photogen_models`.
8. Prompt-ы текущего pipeline вынесены в `src/lib/ai/prompts/legacy-lora.ts`.
9. Generation webhook сохраняет outputs в S3 и добавляет S3 keys в `result_images`.
10. После 3+ сохранённых изображений фотосессия считается `completed`.

## Проблемы текущего pipeline

- LoRA одновременно отвечает и за identity, и за композицию, одежду, фон, позу.
- Выполнено частично: prompt-ы, fallback-подготовка данных фотосессии, извлечение LoRA URL, запуск legacy LoRA prediction и базовые update-helper-ы фотосессий вынесены из webhook route.
- Нет явного quality stage: face match, артефакты, руки, фон, кожа, upscale.
- Нет версионирования prompt-ов и pipeline-версий.
- Нет отдельного хранения промежуточных артефактов: identity reference, composition candidate, face-restored candidate, upscaled final.
- Нет формального выбора лучшего результата из нескольких candidates.
- `generation_id` хранит несколько prediction IDs строкой через запятую.
- `src/lib/ai/generation.ts` выглядит как альтернативный путь и должен быть либо встроен осознанно, либо помечен legacy.

## Цель hybrid pipeline

Разделить ответственность моделей:

1. Flux LoRA через Replicate - только identity: лицо, узнаваемость, персональные черты.
2. Nano Banana - композиция: тело, одежда, поза, фон, кадрирование, настроение.
3. Face-swap или inpainting - перенос/усиление лица пользователя в композиции.
4. Upscale / enhancement - финальное качество, детализация, чистка артефактов.

Главная идея: не заставлять одну модель делать всё сразу.

## Целевая архитектура

### 1. Identity Stage: Flux LoRA

Назначение:

- обучить LoRA по фото пользователя;
- получить `lora_url`;
- сгенерировать или подготовить identity reference images, где лицо похоже на пользователя;
- не требовать от этого этапа идеальной одежды, фона и позы.

Вход:

- `photoshoot.images`;
- `style_id`;
- `gender`;
- параметры внешности.

Выход:

- `lora_url`;
- 1-4 identity reference images или face crops;
- quality metadata: face confidence, similarity score, usable/not usable.

### 2. Composition Stage: Nano Banana

Назначение:

- создать красивую композицию: тело, одежда, поза, фон, свет, кадрирование;
- использовать style preset;
- использовать reference images осторожно, чтобы композиция была сильной, но identity не считалась финальной.

Вход:

- style preset;
- 1-3 reference image URLs;
- desired aspect ratio, например `3:4`;
- user appearance metadata.

Выход:

- 2-4 composition candidates;
- temporary URLs или S3 keys;
- metadata: prompt version, model version, candidate index.

### 3. Face Integration Stage

Варианты реализации:

- face-swap: если нужна максимальная похожесть лица;
- inpainting: если нужно аккуратно заменить/усилить лицо внутри уже хорошей композиции;
- img2img LoRA pass: если face-swap недоступен или даёт неестественную кожу.

Назначение:

- взять лучшую Nano Banana композицию;
- перенести identity из Flux LoRA/reference face;
- сохранить позу, одежду, фон и общий стиль Nano Banana.

Вход:

- composition candidate;
- identity reference;
- mask или face bounding box;
- strength settings.

Выход:

- face-integrated candidate;
- metadata: method, strength, mask source, identity score.

### 4. Final Enhancement Stage

Назначение:

- upscale;
- улучшить резкость и детализацию;
- убрать мелкие артефакты;
- сохранить естественную кожу без пластика.

Вход:

- face-integrated candidate.

Выход:

- final S3 image key;
- preview image key, если понадобится;
- quality metadata.

## Предлагаемая структура кода

Будущий код лучше разложить так:

- `src/lib/ai/pipeline/types.ts` - выполнено: общие типы pipeline, stages, candidates, artifacts и final results.
- `src/lib/ai/pipeline/runHybridGeneration.ts` - главный orchestrator.
- `src/lib/ai/providers/replicate.ts` - единая обёртка над Replicate API.
- `src/lib/ai/stages/trainIdentityLora.ts` - training dataset + LoRA training.
- `src/lib/ai/stages/generateIdentityReferences.ts` - identity reference generation.
- `src/lib/ai/stages/generateNanoBananaCompositions.ts` - Nano Banana composition candidates.
- `src/lib/ai/stages/integrateFace.ts` - face-swap/inpainting/img2img integration.
- `src/lib/ai/stages/upscaleFinal.ts` - final upscale/enhancement.
- `src/lib/ai/prompts/` - prompt presets and versions.
- `src/lib/ai/pipeline/` - текущие и будущие pipeline-сервисы.
- `src/lib/ai/quality/scoreCandidate.ts` - quality checklist and scoring.
- `src/app/api/webhooks/replicate/*` - только приём webhook и передача события в сервис, без prompt-ов внутри route.

## Данные, которые стоит добавить позже

Текущая таблица `photoshoots` хранит только общий статус и массив `result_images`. Для hybrid pipeline этого мало.

Возможные будущие поля или отдельная таблица:

- `generation_pipeline_version`;
- `generation_stage`;
- `identity_lora_url`;
- `identity_reference_images`;
- `composition_images`;
- `face_integrated_images`;
- `upscaled_images`;
- `selected_result_images`;
- `generation_metadata`;
- `quality_scores`;
- `failed_stage`;
- `retry_count`.

Лучше не раздувать `photoshoots` бесконечно. Более чистый вариант - отдельная таблица `generation_jobs` или `generation_candidates`.

## Хранение intermediate candidates

Цель: не смешивать промежуточные изображения с финальными результатами, которые видит пользователь.

Текущее правило для production:

- `photoshoots.result_images` хранит только финальные постоянные S3 keys, которые можно показывать пользователю.
- Промежуточные артефакты не должны попадать в `result_images`.
- До внедрения отдельной таблицы production schema не меняется.

Рекомендуемая будущая модель:

### `generation_jobs`

Одна запись на запуск pipeline для конкретной фотосессии.

Поля:

- `id`;
- `photoshoot_id`;
- `pipeline_version`: `legacy-lora-v1` или `hybrid-v1`;
- `status`: `pending`, `processing`, `completed`, `error`;
- `current_stage`;
- `started_at`;
- `completed_at`;
- `metadata`.

### `generation_candidates`

Одна запись на промежуточный или финальный candidate.

Поля:

- `id`;
- `generation_job_id`;
- `photoshoot_id`;
- `stage`: `identity`, `composition`, `face-integration`, `upscale`, `final`;
- `status`: `pending`, `processing`, `ready`, `selected`, `rejected`, `failed`;
- `artifact_kind`;
- `artifact_storage`: `s3`, `remote-url`, `replicate-output`;
- `artifact_value`: S3 key или временный URL;
- `prompt_version`;
- `model_version`;
- `quality_score`;
- `metadata`;
- `created_at`.

### S3 prefixes

Рекомендуемые префиксы:

- `photoshoots/{photoshootId}/source/` - исходные пользовательские фото;
- `photoshoots/{photoshootId}/training/` - ZIP dataset и training artifacts;
- `photoshoots/{photoshootId}/intermediate/identity/` - identity references и face crops;
- `photoshoots/{photoshootId}/intermediate/composition/` - Nano Banana composition candidates;
- `photoshoots/{photoshootId}/intermediate/face/` - face-integrated candidates;
- `photoshoots/{photoshootId}/intermediate/upscale/` - upscaled candidates до финального отбора;
- `photoshoots/{photoshootId}/final/` - финальные изображения, которые можно записывать в `result_images`.

### Правила показа пользователю

- Пользователь видит только `photoshoots.result_images`.
- Intermediate candidates можно показывать только во внутреннем debug/admin режиме.
- Если candidate выбран финальным, его нужно скопировать или сохранить в `final/`, а затем добавить final S3 key в `result_images`.
- Если stage упал, финальные изображения не должны заменяться промежуточными.

### Правила очистки

- Временные remote URLs не считаются постоянным хранилищем.
- Intermediate S3 keys можно хранить ограниченное время или архивировать после завершения заказа.
- Final S3 keys из `result_images` нельзя удалять автоматической очисткой без отдельного правила.

## Quality checklist

Каждый финальный результат должен проверяться по списку:

- лицо похоже на пользователя;
- нет сильной смены возраста;
- кожа выглядит реалистично, не пластиковая;
- глаза не искажены;
- зубы и улыбка без артефактов;
- руки и пальцы не ломают кадр;
- тело и поза естественные;
- одежда соответствует стилю;
- фон соответствует стилю;
- нет водяных знаков, текста, лишних лиц;
- финальное изображение достаточно резкое;
- результат не выглядит как AI-render.

## Порядок внедрения

### Этап 1: без изменения production logic

- Зафиксировать текущий pipeline.
- Выполнено: вынести prompt-ы из webhook route в отдельные prompt presets.
- Выполнено: вынести запуск legacy LoRA prediction в отдельный pipeline service.
- Выполнено: вынести подготовку prompt input из данных фотосессии в pipeline service.
- Выполнено: вынести извлечение LoRA URL из training payload в pipeline service.
- Выполнено: вынести базовые обновления статусов training flow в `src/lib/photoshoots/status.ts`.
- Выполнено: добавить явные правила переходов статусов в `src/lib/photoshoots/status.ts`.
- Выполнено: применить правила переходов статусов в training webhook.
- Выполнено: применить правила переходов статусов в generation webhook.
- Выполнено: применить правила переходов статусов в status polling.
- Выполнено: добавить типы pipeline stages, candidates, artifacts и final results.
- Выполнено: добавить feature flag `AI_PIPELINE_MODE=legacy-lora-v1|hybrid-v1` с безопасным дефолтом `legacy-lora-v1`.
- Выполнено: перенести Nano Banana POC в безопасный service-каркас без подключения к production flow.
- Сохранить текущую генерацию как `legacy-lora-v1`.

### Этап 2: экспериментальный hybrid mode

- Выполнено: добавить feature flag `AI_PIPELINE_MODE=legacy-lora-v1|hybrid-v1`. Сейчас это безопасная настройка с дефолтом `legacy-lora-v1`, без включения новой production-логики.
- Выполнено: перенести Nano Banana proof-of-concept из `scratch/` в безопасный service-код без записи в Supabase/S3 и без чтения `.env.local`.
- Сохранять intermediate candidates отдельно от финальных `result_images`.
- Не показывать пользователю промежуточные результаты как финальные.

### Этап 3: face integration

- Выбрать первый production-ready метод: face-swap, inpainting или LoRA img2img.
- Добавить masks/crops.
- Сравнить strength settings.
- Добавить retry при слабой похожести.

### Этап 4: final upscale

- Подключить upscale/enhancement stage.
- Сохранять только финальные permanent S3 keys в `result_images`.
- Удалять или архивировать временные артефакты.

### Этап 5: оценка качества

- Собрать тестовый набор из 5-10 фотосессий.
- Сравнить legacy и hybrid по единому чеклисту.
- Зафиксировать prompt versions и model versions.
- Включать hybrid по умолчанию только после стабильного выигрыша качества.

## Риски

- Стоимость может вырасти: hybrid pipeline вызывает несколько моделей вместо одной.
- Время генерации увеличится.
- Face-swap может давать неестественную кожу или попадать в uncanny valley.
- Nano Banana может хорошо делать композицию, но не гарантировать identity.
- Нужна аккуратная политика хранения intermediate images.
- Нужна идемпотентность по каждому stage, иначе webhook retry может создавать дубли.

## Рекомендация

Сначала не менять production generation. Ближайший безопасный шаг - вынести текущие prompt-ы и orchestration из webhook route, оформить `legacy-lora-v1`, а рядом подготовить `hybrid-v1` как экспериментальный pipeline за feature flag.
