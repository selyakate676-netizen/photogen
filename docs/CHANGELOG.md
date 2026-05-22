# Changelog

Этот файл фиксирует изменения по этапам. После каждого заметного изменения агент должен добавлять сюда запись.

## 2026-05-23

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
