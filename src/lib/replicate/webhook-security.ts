import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

export const REPLICATE_WEBHOOK_LOG_CODES = [
  "GENERATION_COUNT_CONFIGURATION_ERROR",
  "PHOTOSHOOT_LOOKUP_FAILED",
  "PREDICTION_NOT_ASSOCIATED",
  "PROVIDER_OUTPUT_INVALID",
  "PROVIDER_REQUEST_FAILED",
  "PROVIDER_START_FAILED",
  "RESULT_PERSISTENCE_FAILED",
  "TRAINING_OUTPUT_INVALID",
  "WEBHOOK_BODY_INVALID",
  "WEBHOOK_PROCESSING_FAILED",
  "WEBHOOK_SIGNATURE_INVALID",
] as const;

type ReplicateWebhookLogCode = (typeof REPLICATE_WEBHOOK_LOG_CODES)[number];
type ReplicateWebhookStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

const ALLOWED_STATUSES = new Set<ReplicateWebhookStatus>([
  "starting", "processing", "succeeded", "failed", "canceled",
]);

export function getReplicateWebhookStatus(value: unknown): ReplicateWebhookStatus | undefined {
  return typeof value === "string" && ALLOWED_STATUSES.has(value as ReplicateWebhookStatus)
    ? (value as ReplicateWebhookStatus)
    : undefined;
}

export function logReplicateWebhook(
  level: "warn" | "error",
  code: ReplicateWebhookLogCode,
  status?: unknown,
): void {
  const safeStatus = getReplicateWebhookStatus(status);
  const details = safeStatus ? { code, status: safeStatus } : { code };
  console[level]("[replicate]", details);
}

function safeEqualBase64(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "base64");
  const expectedBuffer = Buffer.from(expected, "base64");
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function verifyReplicateWebhook(
  headers: Headers,
  rawBody: string,
  signingSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const webhookId = headers.get("webhook-id");
  const timestampValue = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");

  if (!webhookId || !timestampValue || !signatureHeader || !rawBody) return false;

  const timestamp = Number(timestampValue);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > MAX_WEBHOOK_AGE_SECONDS) {
    return false;
  }

  const encodedSecret = signingSecret.startsWith("whsec_")
    ? signingSecret.slice("whsec_".length)
    : "";
  if (!encodedSecret) return false;

  const expected = createHmac("sha256", Buffer.from(encodedSecret, "base64"))
    .update(`${webhookId}.${timestampValue}.${rawBody}`)
    .digest("base64");

  return signatureHeader
    .split(" ")
    .filter((signature) => signature.startsWith("v1,"))
    .some((signature) => safeEqualBase64(signature.slice(3), expected));
}
