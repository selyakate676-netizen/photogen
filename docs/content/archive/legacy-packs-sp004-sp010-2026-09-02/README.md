# Archived prompt baseline: SP-004 through SP-010

Captured: 2026-09-02

This directory preserves the exact prompt implementation that existed before the old commercial packs were rebuilt. It is an archive, not an active runtime source.

## Archived packs

| Pack ID | Legacy technical name | HC count |
| --- | --- | ---: |
| `SP-004` | Cozy Cafe Editorial | 4 |
| `SP-005` | SUP Editorial | 4 |
| `SP-006` | Studio Elegance | 4 |
| `SP-007` | Lakeside Walk | 4 |
| `SP-008` | Petersburg Walk | 4 |
| `SP-009` | Minimal Black Studio | 4 |
| `SP-010` | Russian Editorial | 4 |

## Exact snapshots

| Snapshot | Original source | SHA-256 |
| --- | --- | --- |
| `mvp-generation-adapter.ts.snapshot.txt` | `src/lib/ai/mvp-generation-adapter.ts` | `4A40ADF31B574E92AEC8599B8F7B462C20F253B5C7826288C815052D7C670C6B` |
| `hero-composition-catalog.ts.snapshot.txt` | `src/lib/ai/hero-composition-catalog.ts` | `977DA1564238BEA6153291E2BAF306E0A885BB7A9495FC9673F73BDBFB1B098A` |
| `prompt-system-quality.ts.snapshot.txt` | `src/lib/ai/prompt-system-quality.ts` | `C5EF5487DF7DF46A5A7F56E0F613B8928A8D801F9FA2714A6123D5FD14162A8A` |

The adapter snapshot contains the complete legacy `SERIES_AND_SCENE` and per-HC prompt builders. The catalog snapshot preserves the corresponding structured Hero Composition contracts. The quality snapshot preserves the common assembly layer used with those pack prompts.

## Archive rules

- Never edit the snapshot files in place.
- Do not import snapshot files into runtime code.
- Do not remove a legacy runtime prompt until its replacement pack has passed visual review and has an explicit acceptance decision.
- Reverting a rebuilt pack means restoring its prompt and HC material from this baseline, not rewriting it from memory.
- Provider outputs, signed URLs, secrets and private storage paths are not part of this archive.
