import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase_crystal_wallet.sql", import.meta.url), "utf8");

test("wallet schema uses integer balances and an append-only integer ledger", () => {
  assert.match(migration, /balance_crystals bigint not null default 0/i);
  assert.match(migration, /delta_crystals bigint not null/i);
  assert.match(migration, /delta_crystals <> 0/i);
  assert.match(migration, /balance_after_crystals >= 0/i);
});

test("credit and debit are service-role-only atomic database operations", () => {
  assert.match(migration, /create or replace function public\.credit_wallet/i);
  assert.match(migration, /create or replace function public\.debit_wallet/i);
  assert.equal((migration.match(/for update;/gi) ?? []).length, 2);
  assert.equal((migration.match(/SERVICE_ROLE_REQUIRED/g) ?? []).length, 2);
  assert.match(migration, /grant execute on function public\.credit_wallet[\s\S]*to service_role/i);
  assert.match(migration, /grant execute on function public\.debit_wallet[\s\S]*to service_role/i);
});

test("idempotency is protected by a unique key and transaction-scoped locks", () => {
  assert.match(migration, /idempotency_key text not null unique/i);
  assert.equal((migration.match(/pg_advisory_xact_lock/g) ?? []).length, 2);
  assert.equal((migration.match(/IDEMPOTENCY_KEY_CONFLICT/g) ?? []).length, 2);
});

test("users have owner-read access without direct write privileges", () => {
  assert.match(migration, /create policy wallets_select_own[\s\S]*using \(user_id = auth\.uid\(\)\)/i);
  assert.match(migration, /create policy wallet_transactions_select_own[\s\S]*using \(user_id = auth\.uid\(\)\)/i);
  assert.match(migration, /grant select on table public\.wallets to authenticated, service_role/i);
  assert.match(migration, /grant select on table public\.wallet_transactions to authenticated, service_role/i);
  assert.doesNotMatch(migration, /grant (insert|update|delete).*wallet/i);
});
