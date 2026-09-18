import "server-only";

import { getYooKassaConfig } from "@/lib/env";
import type { YooKassaCreatePaymentInput, YooKassaPayment } from "@/lib/payments/types";

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";
const REQUEST_TIMEOUT_MS = 10_000;

export class YooKassaError extends Error {
  constructor(
    public readonly code: "CONFIGURATION_ERROR" | "PROVIDER_UNAVAILABLE" | "PROVIDER_REJECTED" | "INVALID_PROVIDER_RESPONSE",
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "YooKassaError";
  }
}

type YooKassaClientConfig = { shopId: string; secretKey: string };

async function request(config: YooKassaClientConfig, fetchImpl: typeof fetch, path: string, init: RequestInit): Promise<YooKassaPayment> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${YOOKASSA_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64")}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) throw new YooKassaError("PROVIDER_REJECTED", "YooKassa rejected the payment request");
    const value = await response.json() as Partial<YooKassaPayment>;
    if (!value.id || !value.status) throw new YooKassaError("INVALID_PROVIDER_RESPONSE", "YooKassa returned an invalid response");
    return value as YooKassaPayment;
  } catch (error) {
    if (error instanceof YooKassaError) throw error;
    throw new YooKassaError("PROVIDER_UNAVAILABLE", "YooKassa is temporarily unavailable", 503);
  } finally {
    clearTimeout(timeout);
  }
}

export function createYooKassaClient(config: YooKassaClientConfig, fetchImpl: typeof fetch = fetch) {
  return {
    async createPayment(input: YooKassaCreatePaymentInput) {
      if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new YooKassaError("CONFIGURATION_ERROR", "Invalid payment amount", 500);
      }
      const body: Record<string, unknown> = {
        amount: { value: (input.amountMinor / 100).toFixed(2), currency: "RUB" },
        capture: true,
        payment_method_data: { type: input.paymentMethod },
        confirmation: { type: "redirect", return_url: input.returnUrl },
        description: input.description,
        metadata: input.metadata,
      };
      if (input.receipt) body.receipt = input.receipt;
      return request(config, fetchImpl, "/payments", {
        method: "POST",
        headers: { "Idempotence-Key": input.idempotencyKey },
        body: JSON.stringify(body),
      });
    },
    async getPayment(providerPaymentId: string) {
      return request(config, fetchImpl, `/payments/${encodeURIComponent(providerPaymentId)}`, { method: "GET" });
    },
  };
}

export function getYooKassaClient() {
  return createYooKassaClient(getYooKassaConfig());
}
