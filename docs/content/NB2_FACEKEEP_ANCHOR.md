# ЯКОРЬ — NB2 Facekeep Baseline

Кодовое слово **«ЯКОРЬ»** означает утверждённую короткую формулу максимального сохранения лица для новых коммерческих фотопаков.

## Точка возврата

- Commit: `b060377013326789a0d8dc3334ac464e15091664`
- Git tag: `nb2-facekeep-v1.1`
- Формула: `NB2_FACEKEEP_V1.1_SHORT`
- Реализации: `NB2_FACEKEEP_V1.1_SHORT_PACK` и `NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION`

## Контракт ЯКОРЯ

- model: `google/nano-banana-2`;
- одна первая уникальная фронтальная Persona reference;
- без второй reference и без усреднения лица между ракурсами;
- без composition reference;
- параметры: `1K`, `2:3`, `jpg`;
- один самостоятельный короткий prompt на каждый кадр;
- без legacy Prompt Assembly;
- без дополнительных identity, body, anatomy и realism overlay-блоков;
- одежда, укладка, макияж, поза, окружение и свет описываются непосредственно в коротком prompt текущего кадра.

Точные prompts и их SHA-256 находятся в `src/lib/ai/short-pack-prompts.ts` и защищены тестом `tests/commercial-pack-migration.test.mjs`.

## Безопасное восстановление

Для просмотра или проверки исходной точки без изменения текущей ветки:

```powershell
git switch -c restore/nb2-facekeep-v1.1 nb2-facekeep-v1.1
```

Не использовать `.env.local` для хранения этой памятки. `.env.local` предназначен только для локальных credentials и никогда не должен попадать в Git.
