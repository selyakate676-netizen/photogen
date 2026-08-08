import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const action = await readFile(new URL("../src/app/dashboard/new/actions.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase_photoshoot_crystal_charge.sql", import.meta.url), "utf8");
const lifecycle = await readFile(new URL("../supabase_photoshoot_lifecycle.sql", import.meta.url), "utf8");

test("order snapshot stores the existing package crystal price", () => {
  assert.match(action, /price_crystals:\s*pack\.priceCrystals/);
  assert.match(lifecycle, /old\.package_snapshot is distinct from new\.package_snapshot/);
});

test("generation claim charges the immutable snapshot through debit_wallet", () => {
  assert.match(migration, /package_snapshot->>'price_crystals'/);
  assert.match(migration, /perform public\.debit_wallet\(/);
  assert.match(migration, /'photoshoot:' \|\| v_photoshoot\.id::text \|\| ':charge'/);
});

test("charge and generation claim are serialized before status transition", () => {
  assert.match(migration, /where id = p_photoshoot_id\s+for update;/i);
  const charge = migration.indexOf("perform public.debit_wallet(");
  const generating = migration.indexOf("set status = 'generating'");
  assert.ok(charge >= 0 && generating > charge);
});
