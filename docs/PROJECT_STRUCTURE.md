# Структура проекта

Этот документ объясняет, где что лежит. Он написан простым языком, чтобы владелец проекта мог быстро понять устройство приложения.

## Главные папки

- `src/` - основной код приложения.
- `src/app/` - страницы сайта, личный кабинет, API routes и обработчики авторизации.
- `src/components/` - блоки интерфейса, которые используются на страницах.
- `src/lib/` - техническая логика: AI, S3-хранилище, генерация и обучение.
- `src/lib/env.ts` - безопасное чтение серверных env-переменных без вывода секретов.
- `src/lib/public-env.ts` - безопасное чтение публичных `NEXT_PUBLIC_*` переменных для браузера.
- `src/lib/photoshoots/status.ts` - helper-ы для обновления статусов, служебных полей фотосессий и правила переходов между статусами.
- `src/utils/supabase/` - подключение к Supabase и работа с сессией пользователя.
- `src/types/` - небольшие TypeScript-описания для библиотек без своих типов.
- `src/types/database.ts` - TypeScript-описание текущей Supabase-схемы, чтобы код видел поля таблицы `photoshoots`.
- `public/` - публичные картинки, которые доступны сайту.
- `docs/` - документация проекта.
- `docs/AI_GENERATION_PIPELINE.md` - описание текущей AI-генерации и план hybrid pipeline.
- `scratch/` - локальные отладочные скрипты. Сами скрипты не должны попадать в Git; разрешён только `scratch/README.md` с правилами безопасности.
- `.github/` - настройки автоматического деплоя через GitHub Actions.

## Где страницы

Страницы лежат в `src/app/`.

- `src/app/page.tsx` - главная страница.
- `src/app/login/page.tsx` - вход.
- `src/app/signup/page.tsx` - регистрация.
- `src/app/dashboard/page.tsx` - личный кабинет.
- `src/app/dashboard/new/page.tsx` - создание новой фотосессии.
- `src/app/dashboard/pay/[id]/page.tsx` - страница оплаты.
- `src/app/dashboard/result/[id]/page.tsx` - результат генерации.

## Где API

API routes лежат в `src/app/api/`.

- `api/upload/presigned` - выдаёт временную ссылку для загрузки фото в S3.
- `api/ai/start-training` - запускает обучение.
- `api/ai/status/[id]` - отдаёт статус фотосессии.
- `api/webhooks/replicate/training` - принимает webhook от Replicate после обучения.
- `api/webhooks/replicate/generation` - принимает webhook от Replicate после генерации.

## Где компоненты

Компоненты лежат в `src/components/`.

Примеры:

- `Navbar.tsx` - верхнее меню.
- `Hero.tsx` - первый экран главной страницы.
- `Pricing.tsx` - блок цен.
- `FAQ.tsx` - вопросы и ответы.
- `SocialAuth.tsx` - кнопки входа через внешние сервисы.

## Где стили

- `src/app/globals.css` - общие цвета, размеры, кнопки и базовые стили.
- `*.module.css` рядом с компонентами - стили конкретного блока.

## Где база данных

- `supabase_schema.sql` - главная и актуальная SQL-схема. Используйте её для настройки Supabase.
- `supabase_photoshoots_table.sql` - старый совместимый файл-подсказка. Он оставлен, чтобы не ломать старые ссылки, но больше не является главным источником схемы.

## Где настройки

- `.env.local` - реальные локальные ключи и пароли. Не публиковать.
- `.env.example` - безопасный шаблон без секретов.
- `next.config.ts` - настройки Next.js.
- `tsconfig.json` - настройки TypeScript.
- `eslint.config.mjs` - настройки проверки кода.
- `.gitignore` - список файлов, которые не должны попадать в Git.

## Какие файлы нельзя удалять без подтверждения

- `.env.local`
- `.env.example`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `src/proxy.ts`
- `src/utils/supabase/*`
- `src/lib/ai/*`
- `src/lib/ai/prompts/` - versioned prompt presets для текущего и будущих AI pipeline.
- `src/lib/ai/pipeline/` - сервисы запуска текущих и будущих AI pipeline.
- `src/lib/ai/pipeline/types.ts` - общие типы AI pipeline для stages, candidates, artifacts и final results.
- `src/lib/ai/pipeline/hybrid.ts` - безопасный каркас будущего hybrid pipeline. Сейчас не подключён к production generation.
- `src/lib/photoshoots/*`
- `src/lib/s3.ts`
- SQL-файлы Supabase
- всё в `docs/`, если это не замена на более актуальный документ
