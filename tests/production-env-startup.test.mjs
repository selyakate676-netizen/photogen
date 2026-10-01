import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const verifier = join(root, "scripts", "verify-production-env.mjs");
const startup = readFileSync(join(root, "scripts", "start-production.sh"), "utf8");
const workflow = readFileSync(join(root, ".github", "workflows", "deploy.yml"), "utf8");
const managedNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "REPLICATE_API_TOKEN",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
];

test("production startup clears PM2 copies and reloads the managed secrets", () => {
  for (const name of managedNames) {
    assert.match(startup, new RegExp("-u " + name + "(?:\\r?\\n|$)"));
  }
  assert.match(startup, /--env-file="\$ENV_FILE"/);
  assert.match(startup, /verify-production-env\.mjs/);
  assert.match(startup, /PORT=\$\{PORT:-3001\}/);
  assert.match(startup, /node_modules\/next\/dist\/bin\/next" start -p "\$PORT"/);
  assert.doesNotMatch(startup, /(?:cat|printenv|set -x).*\.env\.local/);
});

test("deploy starts the guarded production entrypoint", () => {
  assert.match(
    workflow,
    /\$PM2_BIN" start "\$CURRENT_LINK\/scripts\/start-production\.sh" --name photogen --interpreter \/usr\/bin\/bash/,
  );
  assert.match(workflow, /PORT="\$CANDIDATE_PORT" \/usr\/bin\/bash "\$RELEASE_DIR\/scripts\/start-production\.sh"/);
  assert.doesNotMatch(workflow, /PORT="\$CANDIDATE_PORT" "\$RELEASE_DIR\/scripts\/start-production\.sh"/);
  assert.match(workflow, /ln -s "\$PRODUCTION_ENV_FILE" \.env\.local/);
  assert.match(workflow, /atomic_switch_current\(\)/);
  assert.match(workflow, /mv -Tf "\$next_link" "\$CURRENT_LINK"/);
  assert.match(workflow, /atomic_switch_current "\$RELEASE_DIR"/);
  assert.match(workflow, /atomic_switch_current "\$previous_release"/);
  assert.doesNotMatch(workflow, /ln -sfn "\$(?:RELEASE_DIR|previous_release)" "\$CURRENT_LINK"/);
  assert.doesNotMatch(workflow, /\$PM2_BIN" start \/usr\/bin\/npm --name "photogen"/);
});

test("env verification reports presence without exposing values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "photogen-env-test-"));
  const envFile = join(directory, ".env.local");
  const sentinels = managedNames.map((name, index) => name + "=sentinel-value-" + index);

  try {
    await writeFile(envFile, sentinels.join("\n") + "\n", { mode: 0o600 });
    const cleanEnv = { ...process.env };
    for (const name of managedNames) delete cleanEnv[name];

    const output = execFileSync(
      process.execPath,
      ["--env-file=" + envFile, verifier],
      { encoding: "utf8", env: cleanEnv },
    );

    assert.match(output, /PASS: 4 required variables are present/);
    assert.doesNotMatch(output, /sentinel-value/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("env verification rejects a missing variable without exposing present values", () => {
  const env = { ...process.env };
  for (const [index, name] of managedNames.entries()) {
    env[name] = name === "S3_SECRET_KEY" ? "" : "sentinel-value-" + index;
  }

  const result = spawnSync(process.execPath, [verifier], {
    encoding: "utf8",
    env,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /S3_SECRET_KEY/);
  assert.doesNotMatch(result.stdout + result.stderr, /sentinel-value/);
});
