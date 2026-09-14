# Old Pack Rebuild Tracker

Scope: the seven legacy commercial packs `SP-004` through `SP-010`.

The original prompt baseline is preserved in `docs/content/archive/legacy-packs-sp004-sp010-2026-09-02/`. The legacy runtime definitions remain available only for historical records; all seven packs are removed from the orderable catalog.

## Rebuild status

| Pack ID | Legacy pack | Current catalog mapping | Rebuild status | Next required input |
| --- | --- | --- | --- | --- |
| `SP-004` | Cozy Cafe Editorial | `SP-017` «Первое впечатление» | `VISUALLY_APPROVED / ORDERABLE` | None; four Model C previews and production prompts are fixed |
| `SP-005` | SUP Editorial | `SP-016` «Бирюзовая волна» | `VISUALLY_APPROVED / ORDERABLE` | None; four previews and production prompts are fixed |
| `SP-006` | Studio Elegance | `SP-019` «Розовый манифест» | `VISUALLY_APPROVED / ORDERABLE` | None; four previews and production prompts are fixed |
| `SP-007` | Lakeside Walk | `SP-020` «Спокойная уверенность» | `VISUALLY_APPROVED / ORDERABLE` | None; four Model C previews and production prompts are fixed |
| `SP-008` | Petersburg Walk | `SP-018` «Прогулка в Санкт-Петербурге» | `VISUALLY_APPROVED / ORDERABLE` | None; four Model A previews and production prompts are fixed |
| `SP-009` | Minimal Black Studio | candidate `SP-014` «Чёрный минимализм» | `VISUALLY_APPROVED / ORDERABLE` | None; four Model C previews and production prompts are fixed |
| `SP-010` | Russian Editorial | `SP-015` «Алый акцент» | `VISUALLY_ACCEPTED / ORDERABLE` | None; four previews and production prompts are fixed |

## Rebuild contract

1. Use one coherent visual photoshoot as the source for each set of Hero Compositions.
2. Translate each source frame into one short composition prompt; do not send the source image to the provider by default.
3. Keep stable outfit, makeup, hairstyle, environment and lighting concise and consistent across the prompts.
4. Use the accepted short identity-preserving authoring direction as the candidate baseline; do not append the legacy long prompt layers automatically.
5. Test one main HC first. Continue with the remaining HCs only after the main HC is visually accepted.
6. Keep the legacy prompt archived and available to historical orders, but never expose it for a new order.
7. Add each rebuilt pack to the catalog/runtime mapping only in a separate reviewed change.
8. Never delete archived prompts or overwrite their snapshots.

## Authored draft candidates

All seven legacy replacements are now visually approved and orderable. `SP-014`, `SP-017` and `SP-020` use Model C previews; `SP-018` uses Model A previews; the previously accepted Model B packs remain active.

The separate birthday pack `SP-021` «Загадай желание» is `VISUALLY_ACCEPTED / ORDERABLE` with four Model B previews and fixed production short prompts. Every frame uses one ordinary thin candle and explicitly excludes numeric candles, age numbers and cake inscriptions.

The separate eight-image pack `SP-022` «Золотое отражение» is `VISUALLY_ACCEPTED / ORDERABLE` with eight Model B previews and fixed production short prompts. Its reflection compositions require the reflected face to belong to the same person rather than introducing a second subject.

The separate four-image variant `SP-023` «Мезенские узоры» is `VISUALLY_ACCEPTED / ORDERABLE` and does not replace `SP-015`. It keeps one exact ivory dress, scarlet apple, narrow velvet mini-kokoshnik and consistent styling across four Model B previews, with ornate and neutral-background setups.

The separate five-image pack `SP-024` «Осеннее отражение» is `VISUALLY_ACCEPTED / ORDERABLE` with five Model C previews and fixed production short prompts. The approved leaf-eye portrait is the cover; the rejected cup frame is not part of the pack.

The four-image pack `SP-026` «Дом в тумане» is `VISUALLY_ACCEPTED / ORDERABLE` with four Model B previews and fixed production short prompts. The approved rainy-veranda seated portrait is the cover; the removed close cup portrait is excluded and the remaining frames retain the same modern country-house mood, styling and misty atmosphere.

The two-image mini-pack `SP-025` «Осенний маршрут» is `VISUALLY_ACCEPTED / ORDERABLE` with two Model B previews and fixed production short prompts. The seated fence-side portrait is the cover; the second frame is cropped from head to knees for stronger identity retention.

## Preview model allocation

- Model A: approved `SP-011`, `SP-012`, `SP-013`, `SP-018`.
- Model B: approved `SP-015`, `SP-016`, `SP-019`, `SP-021`, `SP-022`, `SP-023`, `SP-025`, `SP-026`.
- Model C: approved `SP-014`, `SP-017`, `SP-020`, `SP-024`.

- All candidates use `NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION` (codeword «ЯКОРЬ»).
- Every candidate uses standalone frame prompts and expects one first unique frontal Persona reference.
- Each frame follows the expression visible in its authoring reference: use a light or warm half-smile by default; request visible teeth, a broad smile or laughter only when the specific source frame clearly contains it.
- Stable outfit, hairstyle, makeup and environment are repeated concisely inside every standalone frame prompt.
- The supplied photoshoot collages are authoring references only and are not provider `image_input`.
- Draft candidates are intentionally absent from `photoPacks` and from the production adapter until visual approval and preview generation. Accepted `SP-014`, `SP-015`, `SP-016`, `SP-017`, `SP-019`, `SP-020`, `SP-021`, `SP-022`, `SP-023`, `SP-024`, `SP-025` and `SP-026` are now present in both.
- The legacy prompts and historical resolution remain unchanged.

Accepted `SP-014`, `SP-017`, `SP-018` and `SP-020` contain four frames each. Accepted `SP-021` and `SP-023` contain four frames each. Accepted `SP-022` intentionally contains eight frames. Accepted `SP-024` contains five frames. Accepted `SP-026` contains four frames. Accepted `SP-025` contains two frames.

## Visual validation order

Run only the main `HC-001` for each candidate first, sequentially and only after a separate provider-call approval. Generate all remaining frames only for candidates whose main frame is visually accepted.
