import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("profile UI allows five Persona photos and preserves partial multi-upload", async () => {
  const source = await read("src/app/account/profile/ProfileWorkspace.tsx");
  assert.match(source, /MAX_PERSONA_PHOTOS\s*=\s*5/);
  assert.match(source, /validFiles\.slice\(0, remaining\)/);
  assert.match(source, /for \(const file of filesToUpload\)/);
});

test("Persona Photos API reads the saved sort order", async () => {
  const source = await read("src/app/api/personas/[personaId]/photos/route.ts");
  assert.match(source, /order\("sort_order"\)/);
  assert.ok(source.indexOf('order("sort_order")') < source.indexOf('error?.code === "42703"'));
});

test("reorder endpoint validates a complete ordered UUID list through the database RPC", async () => {
  const source = await read("src/app/api/personas/[personaId]/photos/reorder/route.ts");
  assert.match(source, /new Set\(photoIds\)\.size/);
  assert.match(source, /reorder_persona_photos/);
});

test("photoshoot snapshot is ordered by sort_order", async () => {
  const source = await read("supabase_persona_photos_v2_completion.sql");
  assert.match(source, /array_agg\(pp\.storage_path order by pp\.sort_order\)/);
  assert.match(source, /'awaiting_payment'/);
});

test("last active photo deletion atomically returns Persona to draft", async () => {
  const source = await read("supabase_persona_photos_v2_completion.sql");
  assert.match(source, /if v_count = 1 and v_persona\.status = 'active' then/);
  assert.match(source, /perform public\.persona_internal_write_on\(\)/);
  assert.match(source, /set status = 'draft'/);
  assert.doesNotMatch(source, /ACTIVE_PERSONA_LAST_PHOTO/);
});

test("photo deletion uses durable cleanup and scrubs snapshot references", async () => {
  const [route, worker, migration] = await Promise.all([
    read("src/app/api/personas/[personaId]/photos/[photoId]/route.ts"),
    read("src/lib/deletion-tasks.ts"),
    read("supabase_persona_photo_safe_deletion.sql"),
  ]);
  assert.match(route, /prepare_persona_photo_deletion/);
  assert.match(route, /processEntityDeletionTask\(db, user\.id, "persona_photo", photoId\)/);
  assert.match(route, /status: 502/);
  assert.match(route, /storageCleaned: true/);
  assert.match(worker, /await deletePrivateObject\(claimed\.object_key\)/);
  assert.ok(worker.indexOf("deletePrivateObject(claimed.object_key)") < worker.indexOf("finalizeEntity(sessionDb, serviceDb, claimed)"));
  assert.match(migration, /persona_snapshot = jsonb_set/);
});

test("Studio is separate from catalog generation", async () => {
  const [navbar, studio] = await Promise.all([
    read("src/components/Navbar.tsx"),
    read("src/app/studio/page.tsx"),
  ]);
  assert.match(navbar, /href: '\/studio', label: 'Студия'/);
  assert.doesNotMatch(studio, /dashboard\/new/);
  assert.match(studio, /href="\/catalog"/);
});
