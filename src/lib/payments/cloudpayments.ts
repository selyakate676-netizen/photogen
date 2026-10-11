import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCloudPaymentsApiSecret } from "@/lib/env";

export type CloudPaymentsNotificationType = "check" | "pay" | "fail";

export function verifyCloudPaymentsSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", getCloudPaymentsApiSecret()).update(rawBody, "utf8").digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseAmountMinor(value: string | null): number | null {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [rubles, kopecks = ""] = value.split(".");
  const minor = Number(rubles) * 100 + Number(kopecks.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function parseCloudPaymentsBody(rawBody: string) {
  const body = new URLSearchParams(rawBody);
  const invoiceId = body.get("InvoiceId");
  const transactionId = body.get("TransactionId");
  const amountMinor = parseAmountMinor(body.get("Amount"));
  const currency = body.get("Currency")?.toUpperCase() ?? null;
  if (!invoiceId || !transactionId || amountMinor === null || !currency) return null;
  return { invoiceId, transactionId, amountMinor, currency };
}
