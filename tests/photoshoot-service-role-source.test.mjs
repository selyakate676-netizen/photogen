import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("service-role client is server-only and never uses a public environment key", async () => {
  const source = await read("src/utils/supabase/admin.ts");

  assert.match(source, /^import "server-only";/);
  assert.match(source, /getSupabaseServiceRoleConfig\(\)/);
  assert.match(source, /serviceRoleKey/);
  assert.doesNotMatch(source, /NEXT_PUBLIC/);
  assert.doesNotMatch(source, /console\./);
});

test("generation orchestration authenticates and verifies ownership before generation starts", async () => {
  const source = await read("src/lib/photoshoots/orchestration.ts");
  const auth = source.indexOf("sessionClient.auth.getUser()");
  const owner = source.indexOf('.eq("user_id", user.id)');
  const start = source.indexOf("startMvpGenerationForPhotoshoot(photoshootId");
  const service = source.indexOf("createServiceRoleClient()", start);

  assert.ok(auth >= 0 && auth < owner);
  assert.ok(owner < start);
  assert.ok(service > start, "service role is only used by the guarded failure path");
  assert.match(source, /userId: user\.id/);
});

test("generation adapter performs owner lookup with the session client before internal service operations", async () => {
  const source = await read("src/lib/ai/mvp-generation-adapter.ts");
  const ownerLookup = source.indexOf('const { data: photoshoot, error } = await sessionClient');
  const ownerFilter = source.indexOf('.eq("user_id", ownerId)', ownerLookup);
  const service = source.indexOf("const serviceClient = createServiceRoleClient()", ownerFilter);
  const claim = source.indexOf("claimPhotoshootGeneration(serviceClient", service);

  assert.ok(ownerLookup >= 0 && ownerLookup < ownerFilter);
  assert.ok(ownerFilter < service && service < claim);
  assert.doesNotMatch(source.slice(service), /claimPhotoshootGeneration\(sessionClient/);
  assert.doesNotMatch(source.slice(service), /updatePhotoshoot(?:Generation)?Status\(sessionClient/);
  assert.match(source.slice(service), /\.update\(\{ generation_id:/);
});

test("status polling authenticates and hides foreign photoshoots before creating a service client", async () => {
  const source = await read("src/app/api/ai/status/[id]/route.ts");
  const auth = source.indexOf("sessionClient.auth.getUser()");
  const owner = source.indexOf('.eq("user_id", user.id)');
  const service = source.indexOf("const serviceClient = createServiceRoleClient()", owner);

  assert.ok(auth >= 0 && auth < owner && owner < service);
  assert.match(source, /status: 401/);
  assert.match(source, /status: 404/);
  assert.match(source.slice(service), /updatePhotoshootStatus\(serviceClient/);
});

test("legacy training keeps authentication and owner lookup ahead of its service-only write", async () => {
  const source = await read("src/lib/ai/training.ts");
  const auth = source.indexOf("sessionClient.auth.getUser()");
  const owner = source.indexOf(".eq('user_id', user.id)");
  const service = source.indexOf("const serviceClient = createServiceRoleClient()", owner);
  const update = source.indexOf("await serviceClient", service);

  assert.ok(auth >= 0 && auth < owner && owner < service && service < update);
  assert.match(source.slice(update), /\.update\(\{\s*training_id:/);
});

test("mock payment remains owner-facing and dashboard retry uses guarded orchestration", async () => {
  const [orchestration, dashboardAction] = await Promise.all([
    read("src/lib/photoshoots/orchestration.ts"),
    read("src/app/dashboard/actions.ts"),
  ]);

  const confirmBlock = orchestration.match(
    /export async function confirmMockPaymentAndQueue[\s\S]*?^\}/m,
  )?.[0] ?? "";
  assert.match(confirmBlock, /await createClient\(\)/);
  assert.match(confirmBlock, /confirmMockPhotoshootPayment\(supabase/);
  assert.doesNotMatch(confirmBlock, /createServiceRoleClient/);
  assert.match(dashboardAction, /startQueuedPhotoshootGeneration\(photoshootId, user\.id\)/);
  assert.doesNotMatch(dashboardAction, /startMvpGenerationForPhotoshoot/);
});

test("ACL migration guards exactly the four internal lifecycle RPCs", async () => {
  const source = await read("supabase_rpc_acl_hardening.sql");
  const guards = source.match(/message = 'SERVICE_ROLE_REQUIRED'/g) ?? [];

  assert.equal(guards.length, 4);
  for (const signature of [
    "transition_photoshoot_status(uuid, text, text)",
    "claim_photoshoot_generation(uuid)",
    "finish_photoshoot_generation(uuid, boolean, text)",
    "record_photoshoot_result_images(uuid, text[])",
  ]) {
    assert.match(source, new RegExp(`grant execute on function public\\.${signature.replace(/[\[\](),]/g, "\\$&")}\\s+to service_role`, "i"));
  }

  assert.doesNotMatch(source, /grant\s+all/i);
  assert.doesNotMatch(source, /create\s+(?:table|policy)|alter\s+table/i);
});
