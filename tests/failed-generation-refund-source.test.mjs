import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile("supabase_failed_generation_refund.sql", "utf8");

test("refund requires a matching charge and immutable snapshot amount", () => {
  assert.match(sql, /package_snapshot->>'price_crystals'/);
  assert.match(sql, /idempotency_key = 'photoshoot:' \|\| v_photoshoot\.id::text \|\| ':charge'/);
  assert.match(sql, /'photoshoot:' \|\| v_photoshoot\.id::text \|\| ':refund'/);
  assert.doesNotMatch(sql, /update public\.wallets/);
});

test("failed finish invokes service-only idempotent compensation", () => {
  assert.match(sql, /perform public\.refund_failed_photoshoot\(v_photoshoot\.id\)/);
  assert.match(sql, /SERVICE_ROLE_REQUIRED/);
  assert.match(sql, /grant execute on function public\.refund_failed_photoshoot\(uuid\) to service_role/);
  assert.doesNotMatch(sql, /grant execute[^;]+to authenticated/);
});
