import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile("src/app/api/deletion-tasks/reconcile/route.ts", "utf8");
const worker = await readFile("src/lib/deletion-tasks.ts", "utf8");

test("reconcile endpoint requires a dedicated trusted secret", () => {
  assert.match(route, /getDeletionReconcileSecret/);
  assert.match(route, /timingSafeEqual/);
  assert.doesNotMatch(route, /authenticatedDb/);
});

test("scheduled reconciliation processes pending tasks across users", () => {
  assert.match(route, /reconcileAllDeletionTasks/);
  assert.match(worker, /\.neq\("status", "completed"\)/);
  assert.match(worker, /finalize_deletion_task/);
});
