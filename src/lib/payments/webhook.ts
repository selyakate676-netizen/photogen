import "server-only";

import type { YooKassaPayment } from "@/lib/payments/types";
import type { Database, Json, PaymentStatus } from "@/types/database";
import { getYooKassaClient } from "@/lib/payments/yookassa";
import { createServiceRoleClient } from "@/utils/supabase/admin";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type ProviderTerminalStatus = Extract<PaymentStatus, "succeeded" | "canceled">;
type AuthoritativePaymentEvent = "payment_completed" | "payment_canceled";

export class YooKassaWebhookError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
    this.name = "YooKassaWebhookError";
  }
}

export type YooKassaWebhookDependencies = {
  findPayment(providerPaymentId: string): Promise<PaymentRow | null>;
  getProviderPayment(providerPaymentId: string): Promise<YooKassaPayment>;
  setTerminalStatus(input: {
    paymentId: string;
    status: ProviderTerminalStatus;
    providerSnapshot: Json;
    failureCode: string | null;
  }): Promise<boolean>;
  isPhotoshootUnlocked(payment: PaymentRow): Promise<boolean>;
  confirmPhotoshootPayment(paymentId: string): Promise<void>;
  emitAnalytics(event: AuthoritativePaymentEvent, params: {
    amount: number;
    currency: "RUB";
    payment_status: ProviderTerminalStatus;
    is_test_mode: boolean;
  }): void;
};

function amountMinor(value: string | undefined): number | null {
  if (!value || !/^\d+\.\d{2}$/.test(value)) return null;
  const [rubles, kopecks] = value.split(".");
  const minor = Number(rubles) * 100 + Number(kopecks);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function safeProviderSnapshot(payment: YooKassaPayment): Json {
  return {
    status: payment.status,
    paid: payment.paid === true,
    test: payment.test === true,
    created_at: payment.created_at ?? null,
    expires_at: payment.expires_at ?? null,
    amount: payment.amount?.value ?? null,
    currency: payment.amount?.currency ?? null,
    payment_method: payment.payment_method?.type ?? null,
  };
}

function verifyProviderPayment(internal: PaymentRow, provider: YooKassaPayment): void {
  if (provider.id !== internal.provider_payment_id) {
    throw new YooKassaWebhookError("PROVIDER_PAYMENT_ID_MISMATCH", 409);
  }
  if (amountMinor(provider.amount?.value) !== internal.amount_minor) {
    throw new YooKassaWebhookError("PAYMENT_AMOUNT_MISMATCH", 409);
  }
  if (provider.amount?.currency !== internal.currency || provider.amount.currency !== "RUB") {
    throw new YooKassaWebhookError("PAYMENT_CURRENCY_MISMATCH", 409);
  }
  if (provider.payment_method?.type !== internal.payment_method) {
    throw new YooKassaWebhookError("PAYMENT_METHOD_MISMATCH", 409);
  }
  if (provider.test !== internal.is_test_mode) {
    throw new YooKassaWebhookError("PAYMENT_TEST_MODE_MISMATCH", 409);
  }
}

async function ensureSucceededUnlock(
  payment: PaymentRow,
  dependencies: YooKassaWebhookDependencies,
): Promise<boolean> {
  if (await dependencies.isPhotoshootUnlocked(payment)) return false;
  await dependencies.confirmPhotoshootPayment(payment.id);
  dependencies.emitAnalytics("payment_completed", {
    amount: payment.amount_minor,
    currency: "RUB",
    payment_status: "succeeded",
    is_test_mode: payment.is_test_mode,
  });
  return true;
}

export async function processVerifiedYooKassaPayment(
  providerPaymentId: string,
  dependencies: YooKassaWebhookDependencies,
) {
  const internal = await dependencies.findPayment(providerPaymentId);
  if (!internal) return { outcome: "ignored" as const };

  const provider = await dependencies.getProviderPayment(providerPaymentId);
  verifyProviderPayment(internal, provider);

  if (provider.status !== "succeeded" && provider.status !== "canceled") {
    return { outcome: "pending" as const };
  }

  if (internal.status === "succeeded") {
    if (provider.status !== "succeeded") {
      throw new YooKassaWebhookError("PAYMENT_TERMINAL_STATUS_MISMATCH", 409);
    }
    const unlocked = await ensureSucceededUnlock(internal, dependencies);
    return { outcome: unlocked ? "recovered" as const : "duplicate" as const };
  }

  if (internal.status === "canceled") {
    if (provider.status !== "canceled") {
      throw new YooKassaWebhookError("PAYMENT_TERMINAL_STATUS_MISMATCH", 409);
    }
    return { outcome: "duplicate" as const };
  }

  const changed = await dependencies.setTerminalStatus({
    paymentId: internal.id,
    status: provider.status,
    providerSnapshot: safeProviderSnapshot(provider),
    failureCode: provider.status === "canceled" ? "provider_canceled" : null,
  });

  if (!changed) {
    const current = await dependencies.findPayment(providerPaymentId);
    if (!current) throw new YooKassaWebhookError("PAYMENT_NOT_FOUND", 404);
    if (current.status === "succeeded" && provider.status === "succeeded") {
      const unlocked = await ensureSucceededUnlock(current, dependencies);
      return { outcome: unlocked ? "recovered" as const : "duplicate" as const };
    }
    if (current.status === "canceled" && provider.status === "canceled") {
      return { outcome: "duplicate" as const };
    }
    throw new YooKassaWebhookError("PAYMENT_CONCURRENT_TRANSITION", 409);
  }

  if (provider.status === "succeeded") {
    await dependencies.confirmPhotoshootPayment(internal.id);
    dependencies.emitAnalytics("payment_completed", {
      amount: internal.amount_minor,
      currency: "RUB",
      payment_status: "succeeded",
      is_test_mode: internal.is_test_mode,
    });
  } else {
    dependencies.emitAnalytics("payment_canceled", {
      amount: internal.amount_minor,
      currency: "RUB",
      payment_status: "canceled",
      is_test_mode: internal.is_test_mode,
    });
  }

  return { outcome: "processed" as const, status: provider.status };
}

const productionDependencies: YooKassaWebhookDependencies = {
  async findPayment(providerPaymentId) {
    const admin = createServiceRoleClient();
    const result = await admin.from("payments").select("*")
      .eq("provider_payment_id", providerPaymentId).maybeSingle();
    if (result.error) throw new YooKassaWebhookError("PAYMENT_LOOKUP_FAILED", 500);
    return result.data;
  },
  getProviderPayment(providerPaymentId) {
    return getYooKassaClient().getPayment(providerPaymentId);
  },
  async setTerminalStatus(input) {
    const admin = createServiceRoleClient();
    const result = await admin.from("payments").update({
      status: input.status,
      provider_snapshot: input.providerSnapshot,
      failure_code: input.failureCode,
    }).eq("id", input.paymentId).eq("status", "pending").select("id").maybeSingle();
    if (result.error) throw new YooKassaWebhookError("PAYMENT_UPDATE_FAILED", 500);
    return Boolean(result.data);
  },
  async isPhotoshootUnlocked(payment) {
    const admin = createServiceRoleClient();
    const result = await admin.from("photoshoots").select("payment_id,payment_source,status")
      .eq("id", payment.photoshoot_id).maybeSingle();
    if (result.error) throw new YooKassaWebhookError("PHOTOSHOOT_LOOKUP_FAILED", 500);
    return Boolean(
      result.data
      && result.data.payment_id === payment.id
      && result.data.payment_source === "rub"
      && ["queued", "generating", "completed", "failed"].includes(result.data.status),
    );
  },
  async confirmPhotoshootPayment(paymentId) {
    const admin = createServiceRoleClient();
    const result = await admin.rpc("confirm_yookassa_photoshoot_payment", {
      p_payment_id: paymentId,
    });
    if (result.error) throw new YooKassaWebhookError("PHOTOSHOOT_UNLOCK_FAILED", 500);
  },
  emitAnalytics(event, params) {
    console.info("[payments] authoritative event", { event, ...params });
  },
};

export function processYooKassaWebhook(providerPaymentId: string) {
  return processVerifiedYooKassaPayment(providerPaymentId, productionDependencies);
}
