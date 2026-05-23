# PhotoGen AI — Инструкции для агента

## О проекте

Сервис AI-фотосессий. Пользователь загружает 10–25 своих фото → выбирает стиль → оплачивает → получает AI-сгенерированные профессиональные фотографии.

Стек: Next.js 16 (App Router), TypeScript, Supabase (Auth + PostgreSQL), S3, Replicate (FLUX LoRA), CSS Modules, Vanilla CSS.

## Команды

```bash
npm run build        # Сборка проекта (ОБЯЗАТЕЛЬНО проверять после изменений)
npm run lint         # ESLint
npx tsc --noEmit     # Проверка типов
npm run check        # Всё вместе: lint + typecheck + build
npm run dev          # Dev-сервер на порту 3001
```

**После каждого изменения запускай `npm run check` и убедись что всё проходит без ошибок.**

## Структура проекта

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Лендинг (главная)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Глобальные стили
│   ├── login/                # Страница входа
│   ├── signup/               # Страница регистрации
│   ├── auth/                 # Auth callback
│   ├── dashboard/            # Личный кабинет (защищённые страницы)
│   │   ├── page.tsx          # Список фотосессий
│   │   ├── new/              # Мастер создания фотосессии
│   │   ├── pay/              # Страница оплаты
│   │   └── result/           # Результаты генерации
│   └── api/                  # API Routes
│       ├── ai/               # Запуск обучения, опрос статуса
│       ├── upload/           # Presigned URL для загрузки в S3
│       └── webhooks/         # Webhook-и от Replicate
├── components/               # React-компоненты лендинга (с CSS Modules)
├── lib/                      # Бизнес-логика и утилиты
│   ├── env.ts                # Серверные env-переменные (ОБЯЗАТЕЛЬНО использовать)
│   ├── public-env.ts         # Публичные env-переменные (для клиента)
│   ├── s3.ts                 # S3 клиент
│   ├── ai/                   # AI-пайплайн
│   │   ├── training.ts       # Логика обучения
│   │   ├── generation.ts     # Логика генерации
│   │   ├── prompts/          # Prompt-шаблоны
│   │   └── pipeline/         # Pipeline types и legacy-lora
│   └── photoshoots/          # Бизнес-логика фотосессий
│       └── status.ts         # State machine: статусы и переходы
├── types/
│   └── database.ts           # TypeScript типы Supabase (Database, Photoshoot, и т.д.)
├── utils/supabase/           # Supabase clients (server, client, middleware)
└── proxy.ts                  # Auth proxy (замена middleware для Next.js 16)
```

## Правила разработки

### Стили
- **Всегда CSS Modules** (`.module.css`). Никогда inline styles, никогда Tailwind.
- Компонент `MyComponent.tsx` → стили в `MyComponent.module.css`.
- Импорт: `import styles from './MyComponent.module.css'`.
- Глобальные стили только в `globals.css`.

### Environment Variables
- **Серверный код:** импортируй из `@/lib/env` — `getEnv()`, `getReplicateApiToken()`, `getWebhookSecret()` и т.д.
- **Клиентский код:** импортируй из `@/lib/public-env` — `getPublicSiteUrl()`, `getPublicSupabaseUrl()`.
- **Никогда** не читай `process.env` напрямую. Никогда не читай `.env.local` из файловой системы.

### TypeScript типы
- Типы Supabase определены в `@/types/database` — `Database`, `Photoshoot`, `PhotoshootStatus`, `PhotoshootGender`.
- Supabase клиенты уже типизированы через `SupabaseClient<Database>`.
- Избегай `any`. Используй конкретные типы.

### Статусы фотосессий
- Все переходы статусов через `@/lib/photoshoots/status` — `canTransitionPhotoshootStatus()`, `markPhotoshootGenerating()`, и т.д.
- Допустимые статусы: `pending → training → generating → completed`. Из любого можно перейти в `error`. Из `error` можно вернуться в `training`.

### Supabase
- Серверный клиент: `@/utils/supabase/server` — `createClient()`.
- Клиентский: `@/utils/supabase/client` — `createBrowserClient()`.
- Auth proxy в `src/proxy.ts` (не middleware — Next.js 16 не поддерживает middleware).

### Компоненты
- Компоненты лендинга в `src/components/` — каждый с парой `.tsx` + `.module.css`.
- Компоненты dashboard — внутри `src/app/dashboard/` рядом со страницами.
- Используй `lucide-react` для иконок.

## Запрещено

- **Не трогай `scratch/`** — там отладочные скрипты, они исключены из lint и typecheck.
- **Не коммить секреты** — `.env.local` в `.gitignore`, используй `.env.example` как шаблон.
- **Не меняй `supabase_schema.sql`** без явного указания — это главный файл схемы БД.
- **Не добавляй зависимости** без явной необходимости.
- **Не используй Tailwind** — проект на Vanilla CSS + CSS Modules.

## Полезный контекст

- Проект на русском языке (UI тексты на русском, код и комментарии на английском/русском).
- Файлы в UTF-8. PowerShell может некорректно отображать русские символы — это нормально.
- Документация проекта: `docs/` — `CHANGELOG.md`, `AI_GENERATION_PIPELINE.md`, `PROJECT_STRUCTURE.md`, `ENV_GUIDE.md`.
- AI pipeline mode управляется через env `AI_PIPELINE_MODE` (default: `legacy-lora-v1`).
