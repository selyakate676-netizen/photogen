import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { getCloudPaymentsGenerationCronSecret } from "@/lib/env";

export function verifyCloudPaymentsCronAuthorization(authorization: string | null): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  if (!supplied) return false;

  const expectedDigest = createHash("sha256")
    .update(getCloudPaymentsGenerationCronSecret(), "utf8")
    .digest();
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();

  return timingSafeEqual(suppliedDigest, expectedDigest);
}
