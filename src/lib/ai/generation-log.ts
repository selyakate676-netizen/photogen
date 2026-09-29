export type GenerationStage =
  | "photoshoot"
  | "claim"
  | "wallet_payment_gate"
  | "provider_call"
  | "prediction"
  | "webhook"
  | "result";

export type GenerationErrorCode =
  | "INSUFFICIENT_CRYSTALS"
  | "CLAIM_REJECTED"
  | "CLAIM_ERROR"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "WEBHOOK_VERIFICATION_ERROR"
  | "WEBHOOK_ERROR"
  | "PHOTOSHOOT_NOT_FOUND"
  | "PREDICTION_NOT_ASSOCIATED"
  | "PREDICTION_FAILED"
  | "INVALID_PROVIDER_OUTPUT"
  | "RESULT_PERSISTENCE_ERROR"
  | "RESULT_COUNT_ERROR"
  | "RESULT_TRANSITION_ERROR";

type GenerationLogLevel = "info" | "warn" | "error";

export function logGenerationEvent(
  level: GenerationLogLevel,
  event: string,
  stage: GenerationStage,
  photoshootId: string,
  errorCode?: GenerationErrorCode,
): void {
  const entry = {
    event,
    stage,
    photoshoot_id: photoshootId,
    ...(errorCode ? { error_code: errorCode } : {}),
  };

  console[level]("[generation]", JSON.stringify(entry));
}

export function getClaimErrorCode(error: unknown): GenerationErrorCode {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";

  return message.includes("INSUFFICIENT_CRYSTALS")
    ? "INSUFFICIENT_CRYSTALS"
    : "CLAIM_ERROR";
}

export function getProviderErrorCode(error: unknown): GenerationErrorCode {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  return normalized.includes("unauthorized")
    || normalized.includes("authentication")
    || normalized.includes("api token")
    || normalized.includes("401")
    || normalized.includes("403")
    ? "PROVIDER_AUTH_ERROR"
    : "PROVIDER_ERROR";
}
