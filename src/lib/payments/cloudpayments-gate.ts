import "server-only";
import { getOptionalEnv } from "@/lib/env";

type CloudPaymentsCheckoutMode = "off" | "test" | "all";

function getCheckoutMode(): CloudPaymentsCheckoutMode {
  const rawMode = getOptionalEnv("CLOUDPAYMENTS_RUB_CHECKOUT_MODE", "off")?.toLowerCase();

  if (rawMode === "all" || rawMode === "test" || rawMode === "off") {
    return rawMode;
  }

  return "off";
}

function getAllowedTestUserIds(): Set<string> {
  const rawIds = getOptionalEnv("CLOUDPAYMENTS_RUB_CHECKOUT_TEST_USER_IDS", "");

  return new Set(
    rawIds
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [],
  );
}

export function isCloudPaymentsRubCheckoutAllowed(userId: string): boolean {
  const mode = getCheckoutMode();

  if (mode === "off") return false;
  if (mode === "all") return true;

  return getAllowedTestUserIds().has(userId);
}
