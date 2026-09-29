const REQUIRED_PRODUCTION_SECRETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "REPLICATE_API_TOKEN",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
];

const missing = REQUIRED_PRODUCTION_SECRETS.filter(
  (name) => typeof process.env[name] !== "string" || process.env[name].trim() === "",
);

if (missing.length > 0) {
  console.error("[production-env] BLOCKED: missing or empty: " + missing.join(", "));
  process.exit(1);
}

console.log(
  "[production-env] PASS: " + REQUIRED_PRODUCTION_SECRETS.length + " required variables are present",
);
