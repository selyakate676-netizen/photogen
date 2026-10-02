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

test("deploy retention preserves current and one rollback release", () => {
  assert.match(workflow, /previous_release=\$\(readlink -f -- "\$CURRENT_LINK"\)/);
  assert.match(workflow, /assert_managed_release_dir "\$previous_release"/);
  assert.match(workflow, /cleanup_releases_except "\$previous_release" ""/);
  assert.match(workflow, /cleanup_releases_except "\$RELEASE_DIR" "\$previous_release"/);
  assert.match(workflow, /find "\$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -print0/);
  assert.match(workflow, /if \[ "\$release_dir" != "\$keep_current" \] && \[ "\$release_dir" != "\$keep_rollback" \]/);
});

test("deploy retention rejects unsafe paths and cleans a non-current partial rerun", () => {
  assert.match(workflow, /"\$RELEASES_DIR"\/\*\) ;;/);
  assert.match(workflow, /test "\$\(dirname -- "\$release_dir"\)" = "\$RELEASES_DIR"/);
  assert.match(workflow, /test ! -L "\$release_dir"/);
  assert.match(workflow, /Refusing to remove current release/);
  assert.match(workflow, /remove_release_dir "\$RELEASE_DIR" 2>\/dev\/null \|\| true/);
  assert.doesNotMatch(workflow, /rm -rf -- "\$(?:DEPLOY_ROOT|SHARED_DIR|CURRENT_LINK|PRODUCTION_ENV_FILE)"/);
});

test("deploy checks free space after cleanup and before creating the worktree", () => {
  const cleanup = workflow.indexOf('cleanup_releases_except "$previous_release" ""');
  const diskCheck = workflow.indexOf('available_kb=$(df -Pk "$DEPLOY_ROOT"');
  const worktree = workflow.indexOf('git worktree add --detach "$RELEASE_DIR"');

  assert.ok(cleanup >= 0 && diskCheck > cleanup && worktree > diskCheck);
  assert.match(workflow, /readonly MIN_FREE_KB=2097152/);
  assert.match(workflow, /Insufficient disk space before build/);
});
function extractWorkflowShellFunction(name) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `            ${name}() {`);
  const end = lines.findIndex((line, index) => index > start && line === "            }");
  assert.ok(start >= 0 && end > start, `missing shell function ${name}`);
  return lines.slice(start, end + 1).map((line) => line.slice(12)).join("\n");
}

test("release cleanup behavior is path-safe and retention-bounded", () => {
  const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
  const functions = [
    extractWorkflowShellFunction("assert_managed_release_dir"),
    extractWorkflowShellFunction("remove_release_dir"),
    extractWorkflowShellFunction("cleanup_releases_except"),
  ].join("\n\n");
  const script = `set -euo pipefail
${functions}
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
RELEASES_DIR="$root/releases"
REPO_DIR="$root/repo"
CURRENT_LINK="$RELEASES_DIR/current"
mkdir -p "$RELEASES_DIR/current" "$RELEASES_DIR/stale" "$RELEASES_DIR/partial" "$root/shared"
git init -q "$REPO_DIR"
cleanup_releases_except "$RELEASES_DIR/current" ""
test -d "$RELEASES_DIR/current"
test ! -e "$RELEASES_DIR/stale"
test ! -e "$RELEASES_DIR/partial"
test -d "$root/shared"
if remove_release_dir "$RELEASES_DIR/current" >/dev/null 2>&1; then exit 10; fi
if remove_release_dir "$root/outside" >/dev/null 2>&1; then exit 11; fi
mkdir -p "$RELEASES_DIR/next" "$RELEASES_DIR/rollback" "$RELEASES_DIR/old"
CURRENT_LINK="$RELEASES_DIR/next"
cleanup_releases_except "$RELEASES_DIR/next" "$RELEASES_DIR/rollback"
test -d "$RELEASES_DIR/next"
test -d "$RELEASES_DIR/rollback"
test ! -e "$RELEASES_DIR/old"
test -d "$root/shared"
`;

  execFileSync(bash, ["-c", script], { stdio: "pipe" });
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
