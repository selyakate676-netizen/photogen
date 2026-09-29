#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="$APP_ROOT/.env.local"
NODE_BIN=$(command -v node)
PORT=${PORT:-3001}

if [ ! -s "$ENV_FILE" ]; then
  echo "[production-env] BLOCKED: $ENV_FILE is missing or empty" >&2
  exit 1
fi

# PM2 preserves process environment between restarts. Remove only the managed
# secrets so Node reloads their current values from the production env file.
CLEAN_ENV=(
  /usr/bin/env
  -u SUPABASE_SERVICE_ROLE_KEY
  -u REPLICATE_API_TOKEN
  -u S3_ACCESS_KEY
  -u S3_SECRET_KEY
)

"${CLEAN_ENV[@]}" "$NODE_BIN" --env-file="$ENV_FILE" \
  "$APP_ROOT/scripts/verify-production-env.mjs"

cd "$APP_ROOT"
exec "${CLEAN_ENV[@]}" "$NODE_BIN" --env-file="$ENV_FILE" \
  "$APP_ROOT/node_modules/next/dist/bin/next" start -p "$PORT"
