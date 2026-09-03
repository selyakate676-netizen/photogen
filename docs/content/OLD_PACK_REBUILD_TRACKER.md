# Old Pack Rebuild Tracker

Scope: the seven legacy commercial packs `SP-004` through `SP-010`.

The original prompt baseline is preserved in `docs/content/archive/legacy-packs-sp004-sp010-2026-09-02/`. The legacy runtime definitions remain available only for historical records; all seven packs are removed from the orderable catalog.

## Rebuild status

| Pack ID | Legacy pack | Current catalog mapping | Rebuild status | Next required input |
| --- | --- | --- | --- | --- |
| `SP-004` | Cozy Cafe Editorial | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-005` | SUP Editorial | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-006` | Studio Elegance | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-007` | Lakeside Walk | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-008` | Petersburg Walk | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-009` | Minimal Black Studio | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |
| `SP-010` | Russian Editorial | removed from sale | `ARCHIVED` | Rebuild only after a new four-frame concept is approved |

## Rebuild contract

1. Use one coherent visual photoshoot as the source for four Hero Compositions.
2. Translate each source frame into one short composition prompt; do not send the source image to the provider by default.
3. Keep stable outfit, makeup, hairstyle, environment and lighting concise and consistent across the four prompts.
4. Use the accepted short identity-preserving authoring direction as the candidate baseline; do not append the legacy long prompt layers automatically.
5. Test one main HC first. Continue with the remaining HCs only after the main HC is visually accepted.
6. Keep the legacy prompt archived and available to historical orders, but never expose it for a new order.
7. Add each rebuilt pack to the catalog/runtime mapping only in a separate reviewed change.
8. Never delete archived prompts or overwrite their snapshots.

## Recommended order

Start with an inactive, visually controlled pack to validate the rebuild workflow. Recommended first candidate: `SP-006 Studio Elegance`. Rebuild the currently active `SP-004` only after the workflow is stable.
