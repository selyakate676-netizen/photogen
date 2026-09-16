# PhotoGen MVP Baseline

Status date: 2026-09-15
GitHub production baseline: `3306be011a8b461d48b4c4f4f1c1bbcd2b751a0e`
Canonical new-catalog candidate: `release/new-photo-pack-catalog` at `102b5c0e4fe2691783f1e790644646043119c38b`

## Baseline rule

> PhotoGen evolves incrementally. Accepted and working MVP functionality is not removed, replaced with an older version, or rewritten without a separate explicit decision.
>
> New functionality is layered on top of the stable baseline.
>
> Every task changes only its declared scope.

This document records the stable foundation. `ROADMAP.md` records remaining work. When they disagree about current implementation status, this evidence-based baseline takes precedence until the roadmap is separately updated.

## KEEP / FROZEN

### Account and Persona

- Signup and login use the existing Supabase Auth flow.
- Persona profile, questionnaire data, private Persona photos, ownership restrictions and default-Persona selection are one system; do not create a parallel Persona implementation.
- A photoshoot stores an immutable `persona_snapshot` and generation uses that snapshot.
- Persona photos remain private and owner-scoped through the existing API, storage and ACL/RLS contracts.

Evidence includes the account/profile routes, Persona API modules, typed database contract, Persona source tests and Persona/Persona-photo pgTAP suites.

### Photoshoot and generation lifecycle

- Preserve the current lifecycle and protected transitions.
- Internal lifecycle operations use the server-only service-role client.
- Generation claim is atomic; a duplicate claim must not create additional predictions.
- The generation-count contract is `requested_images_count`: completion requires exactly that number of internal S3 result keys.
- Provider output is downloaded server-side; temporary provider URLs are not the persisted product result.
- Preserve history, owner detail and hidden foreign-order behavior.

Do not rewrite lifecycle, payment transitions, webhook ownership, result storage or retry behavior while changing UI or Photo Packs.

### Crystal Wallet

- Wallet and append-only ledger are the accounting source.
- Credit and debit operations are server-controlled and idempotent.
- Generation debit uses the immutable order price snapshot.
- Failed-generation refund and double-refund protection are DONE / PRODUCTION at the current GitHub main baseline.
- Refund is not an unfinished roadmap item.

### AI and Facekeep

- `google/nano-banana-2` is supported by the generation provider adapter; the default remains `openai/gpt-image-2` unless production configuration explicitly selects another supported model.
- The accepted content direction for new packs is the short Facekeep / identity-anchor formula recorded by `docs/content/NB2_FACEKEEP_ANCHOR.md` in the catalog release chain.
- That short flow uses one primary Persona identity reference.
- New packs must not silently fall back to or reintroduce the legacy long Prompt Assembly.
- Facekeep, identity rules, provider selection and payload contracts are not changed by unrelated UI or content tasks.

The short Facekeep content and the new catalog are release-candidate work until their catalog branch is integrated into `main`; the global runtime provider contract remains frozen.

### Photo Pack architecture

- Preserve the existing pack architecture; do not introduce a parallel pack system.
- Prompt definitions, metadata, catalog and generation mappings, previews and tests form one content asset.
- A pack is not release-ready when only one of these layers exists.
- Legacy pack data remains available separately when required for historical orders.
- The current catalog is assembled on the existing architecture, not by replacing it.

### UI baseline

- Accepted UI components are part of the baseline and must not be overwritten from older worktrees.
- Canonical `HowItWorks` restoration is IN PROGRESS on the separate commit `e73a9f6025551159e569853303a35d9c4e57376d` (`fix/restore-how-it-works`).
- The restored component contains step text, imagery and contextual CTA/navigation.
- After its separate merge into `main`, it becomes KEEP and must not be reverted by unrelated branches.

### Analytics

- Yandex Metrika, explicit consent gating, duplicate initialization protection and funnel goal helpers are KEEP.
- Analytics must never block navigation or application runtime.

### Deployment

- GitHub Actions → VPS → PM2/Nginx is the current deployment architecture.
- Existing health checks and production environment handling are KEEP / IMPROVE LATER.
- Do not redesign deployment as part of content, UI or baseline-documentation work.

## NEW PHOTO PACK CATALOG — KEEP

The current product catalog consists of 20 factually present packs, `SP-011` through `SP-030`. The current release candidate is `release/final-photo-pack-catalog`, based on the corrected SP-025 release chain at `dd523900cf03935d575772063cb0c24e4d17ed6b`.

The release branch contains 77 HC/prompt definitions and 77 preview files. Mini packs are a valid final catalog format: a two- or three-image mini-pack is COMPLETE when its HC, prompt and preview counts match. `SP-025`, `SP-027` and `SP-029` are intentional two-frame packs; `SP-028` and `SP-030` are intentional three-frame packs.

| Pack | Name | HC / prompts | Previews | Model | Product status | Main preview | Canonical source |
|---|---|---:|---:|---|---|---|---|
| `SP-011` | Осенний променад | 4 | 4 | A | visually approved / orderable candidate | `sp011-autumn-promenade-model-a-hc001.jpg` | `102b5c0` release chain |
| `SP-012` | Туманное утро | 4 | 4 | A | visually approved / orderable candidate | `sp012-misty-morning-model-a-hc001.jpg` | `102b5c0` release chain |
| `SP-013` | Золотое поле | 4 | 4 | A | visually approved / orderable candidate | `sp013-golden-field-model-a-hc001.jpg` | `102b5c0` release chain |
| `SP-014` | Чёрный минимализм | 4 | 4 | C | visually approved / orderable candidate | `sp014-black-minimalism-model-c-hc003.jpg` | `102b5c0` release chain |
| `SP-015` | Алый акцент | 4 | 4 | B | visually accepted / orderable candidate | `sp015-scarlet-accent-model-b-hc004.jpg` | `102b5c0` release chain |
| `SP-016` | Бирюзовая волна | 4 | 4 | B | visually approved / orderable candidate | `sp016-turquoise-wave-model-b-hc001.jpg` | `102b5c0` release chain |
| `SP-017` | Первое впечатление | 4 | 4 | C | visually approved / orderable candidate | `sp017-first-impression-model-c-hc003.jpg` | `102b5c0` release chain |
| `SP-018` | Прогулка в Санкт-Петербурге | 4 | 4 | A | visually approved / orderable candidate | `sp018-petersburg-walk-model-a-hc001.jpg` | `102b5c0` release chain |
| `SP-019` | Розовый манифест | 4 | 4 | B | visually approved / orderable candidate | `sp019-pink-manifesto-model-b-hc004.jpg` | `102b5c0` release chain |
| `SP-020` | Спокойная уверенность | 4 | 4 | C | visually approved / orderable candidate | `sp020-quiet-confidence-model-c-hc002.jpg` | `102b5c0` release chain |
| `SP-021` | Загадай желание | 4 | 4 | B | visually accepted / orderable candidate | `sp021-make-a-wish-model-b-hc001.jpg` | `102b5c0` release chain |
| `SP-022` | Золотое отражение | 8 | 8 | B | visually accepted / orderable candidate | `sp022-golden-reflection-model-b-hc001.jpg` | `102b5c0` release chain |
| `SP-023` | Мезенские узоры | 4 | 4 | B | visually accepted / orderable candidate | `sp023-scarlet-accent-2-model-b-hc001.jpg` | `102b5c0` release chain |
| `SP-024` | Осеннее отражение | 5 | 5 | C | visually accepted / orderable candidate | `sp024-autumn-lake-model-c-hc001.jpg` | `102b5c0` release chain |
| `SP-025` | Осенний маршрут | 2 | 2 | B | PRODUCT_APPROVED / COMPLETE / RELEASE_READY | `sp025-autumn-route-model-b-hc001.jpg` | `fix/sp025-two-frame-contract` |
| `SP-026` | Дом в тумане | 4 | 4 | B | visually accepted / orderable candidate | `sp026-misty-cabin-model-b-hc001.jpg` | `102b5c0` |
| `SP-027` | Листопад | 2 | 2 | B | visually accepted / orderable candidate | `sp027-leaf-fall-model-b-hc001.jpg` | `release/final-photo-pack-catalog` |
| `SP-028` | Осеннее тепло | 3 | 3 | B | visually accepted / orderable candidate | `sp028-autumn-warmth-model-b-hc002.jpg` | `release/final-photo-pack-catalog` |
| `SP-029` | Осень на Красной площади | 2 | 2 | B | visually accepted / orderable candidate | `sp029-red-square-autumn-model-b-hc002.jpg` | `release/final-photo-pack-catalog` |
| `SP-030` | Чёрно-белый характер | 3 | 3 | C | visually accepted / orderable candidate | `sp030-monochrome-character-model-c-hc002.jpg` | `release/final-photo-pack-catalog` |

Pack evidence and mappings:

- prompts and generation mapping: `src/lib/ai/short-pack-prompts.ts` and the existing generation adapter;
- metadata, catalog mapping and main/gallery previews: `src/lib/photoPacks.ts`;
- preview assets: `public/package-previews/`;
- product decisions and model assignments: `docs/content/OLD_PACK_REBUILD_TRACKER.md`;
- catalog and prompt assertions: `tests/commercial-pack-migration.test.mjs` and `tests/draft-short-pack-prompts.test.mjs`.

The 20-pack catalog is a preserved product asset. It must not be replaced with legacy packs from an older worktree. It is not yet part of GitHub `main`; integration and final catalog QA remain IN PROGRESS.

## IN PROGRESS

### New catalog release

- Integrate the committed `release/new-photo-pack-catalog` dependency chain into current `main` without losing wallet/refund, analytics, UI or deployment changes.
- Preserve the approved two-frame `SP-025` contract consistently across metadata, prompts, previews and pricing.
- Run catalog release QA for prompts, previews, mappings, orderability, historical lookup and responsive catalog presentation.
- Preserve legacy/historical compatibility separately.

### Canonical HowItWorks

- Review and merge the isolated restore commit `e73a9f6025551159e569853303a35d9c4e57376d`.
- After release verification, change its status from IN PROGRESS to KEEP.

## REQUIRED BEFORE MVP LAUNCH

### Real payments

The current pay page explicitly identifies mock payment and a future YooKassa redirect. A complete real-payment flow is not proven.

Required:

- payment provider integration and payment/top-up record;
- success, cancel and pending behavior;
- authenticated webhook with idempotency;
- credit crystals only after confirmed payment;
- sandbox end-to-end QA.

### Legal

No complete legal document set was found in the audited repository.

Required before public launch:

- operator/company details and contacts;
- privacy policy and public offer;
- personal-data and image-generation consent;
- retention/deletion terms aligned with the actual flow;
- discoverable footer links.

### Data retention and deletion

Persona-photo deletion exists, but complete account deletion, Persona deletion and documented retention/storage lifecycle were not proven. Treat these as required until evidence exists.

### Final end-to-end QA

Verify the actual user flow on desktop and mobile:

`signup → Persona → upload photos → catalog → balance/payment → photoshoot → generation → result → history`

Include empty states, failed states, insufficient balance, refund, ownership restrictions and broken route/asset checks.

### Operational minimum

Provide a documented, tested way to identify and safely handle failed orders, stuck generation and provider errors. A complex admin panel is not required for MVP when a smaller operational procedure is sufficient.

## POST-MVP

- Telegram Bot.
- Telegram Mini App as a distribution channel over the shared web backend and business logic.
- Global redesign.
- New Prompt Architecture.
- New Photo Pack system.
- Automatic AI selection of Persona reference quality.
- Complex admin panel.
- Provider research without a concrete production blocker.
- Large architectural refactors.

## Roadmap audit

`ROADMAP.md` was last materially updated on 2026-05-23 and is not a reliable description of current implementation status.

Already completed but still described there as missing, partial or risky include:

- atomic protected lifecycle and service-role operations;
- substantial Persona, lifecycle and ACL test coverage;
- supported Nano Banana 2 provider adapter;
- Crystal Wallet, generation debit and failed-generation refund;
- current generation-count contract;
- consent-gated Yandex Metrika;
- the 20-pack catalog release candidate.

Still relevant roadmap themes include real payments, retention/deletion, final E2E, operational visibility, accessibility/UX hardening and limited cleanup of legacy code. Update `ROADMAP.md` in a separate task; do not rewrite it as part of this freeze.

## Integration Guardrails

1. Create every new branch from current GitHub `main`.
2. Before merge, inspect `git diff main...HEAD`.
3. Unrelated subsystem changes are prohibited.
4. An older worktree is not authoritative merely because it contains a working version.
5. Accepted UI/content must first be preserved in Git/main; subsequent branches build on it.
6. Never merge a dirty worktree directly.
7. Provider outputs, temporary files, env files, secrets, dumps and rollback artifacts do not enter Git.
8. Photo Pack changes do not change Persona, Wallet, Refund, Payments or global Facekeep without separate scope.
9. UI changes do not change prompts, generation or catalog content without separate scope.
10. Before production release run TypeScript, ESLint, production build, focused tests, `git diff --check` and applicable CI.
11. A feature marked KEEP may be changed only by an explicit scoped decision; merges must not silently restore an older version.
12. Documentation must distinguish code present in `main`, release-candidate branches and actually verified production state.
