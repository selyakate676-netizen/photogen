# Scratch Scripts

This folder is for local debugging and emergency maintenance scripts.

Important: do not run files from this folder unless you understand what the script does and have confirmed the target project, database, and photoshoot ID.

## Safety Rules

- Real scripts in this folder are local-only and must not be committed.
- This `README.md` is the only file in `scratch/` that is allowed in Git.
- Do not paste real API keys, passwords, Supabase keys, S3 keys, or OpenAI keys into scripts.
- Do not print secret values to the terminal or chat.
- Before running a script, check whether it reads, updates, inserts, deletes, uploads to S3, or starts Replicate jobs.
- Make a backup or export important database rows before running scripts that update or delete data.
- Prefer using the real app flow or a documented admin tool instead of one-off scripts.

## Risk Levels

### High Risk

These scripts can change production-like data, remove data, trigger paid AI work, or write files to S3:

- `cleanup_old.js` - deletes old `photoshoots` rows.
- `clear_results.js` - clears generated result data.
- `direct_generate.js`, `continue_generation.js`, `beauty_generate.js`, `clothing_test.js`, `compare_apr20.js` - can start generation and update records.
- `force_gen.js`, `force_generation.js`, `full_force.js`, `emergency_trigger.js`, `final_trigger.js`, `manual_debug_trigger.js` - can force training or generation flows.
- `hybrid_*.js`, `nano_banana_*.js`, `save_nb_result.js`, `salvage_lora.js` - can read/write S3 and update generated results.
- SQL files such as `fix_status.sql` and `add_gender_field.sql` - can change database schema or data.

### Medium Risk

These scripts mostly inspect external systems, but may still call Replicate, Supabase, or S3:

- `check_*.js`
- `compare_*.js`
- `list_all*.js`
- `verify_uploads.js`
- `get_*.js`
- `show_prompts.js`

### Low Risk

Simple local experiments may be low risk, but treat every script as unsafe until checked.

## Questions To Ask Before Running

1. What exact file will be run?
2. Does it use `SUPABASE_SERVICE_ROLE_KEY`, S3 keys, or Replicate tokens?
3. Does it update, insert, delete, or clear database rows?
4. Does it start paid Replicate work?
5. Which photoshoot ID or user data will it affect?
6. Is there a safer app/API path for the same action?

## Future Cleanup

The long-term goal is to move useful maintenance actions into a documented `scripts/` or admin workflow with confirmations, dry-run mode, and typed environment access. Obsolete experiments should be removed only after owner confirmation.
