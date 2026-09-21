import "server-only";

import { randomUUID } from "node:crypto";
import { getSiteUrl, getYooKassaConfig } from "@/lib/env";
import type { PaymentMethod, YooKassaPayment } from "@/lib/payments/types";
import { getYooKassaClient, YooKassaError } from "@/lib/payments/yookassa";
import type { Database, Json } from "@/types/database";
import { createServiceRoleClient } from "@/utils/supabase/admin";

type PhotoshootPaymentRow = Pick<Database["public"]["Tables"]["photoshoots"]["Row"], "id" | "user_id" | "status" | "style_id" | "package_snapshot" | "attribution_snapshot">;
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export class PaymentRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
    this.name = "PaymentRequestError";
  }
}

function snapshotObject(value: Json | null): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : null;
}

function amountMinorFromPhotoshoot(photoshoot: PhotoshootPaymentRow) {
  const priceRub = snapshotObject(photoshoot.package_snapshot)?.price_rub;
  if (typeof priceRub !== "number" || !Number.isInteger(priceRub) || priceRub <= 0) {
    throw new PaymentRequestError("INVALID_PACKAGE_PRICE", 409);
  }
  return priceRub * 100;
}

function safeProviderSnapshot(payment: YooKassaPayment) {
  return {
    status: payment.status,
    paid: payment.paid === true,
    test: payment.test === true,
    created_at: payment.created_at ?? null,
    expires_at: payment.expires_at ?? null,
    payment_method: payment.payment_method?.type ?? null,
    confirmation_type: payment.confirmation?.type ?? null,
  };
}

function paymentReturnUrl(paymentId: string) {
  const configured = new URL(getYooKassaConfig().returnUrl, getSiteUrl());
  configured.pathname = `/dashboard/pay/${paymentId}/result`;
  configured.search = "";
  configured.hash = "";
  return configured.toString();
}

export async function createOrReuseYooKassaPayment(input: { userId: string; photoshootId: string; paymentMethod: PaymentMethod }) {
  const admin = createServiceRoleClient();
  const lookup = await admin.from("photoshoots")
    .select("id,user_id,status,style_id,package_snapshot,attribution_snapshot")
    .eq("id", input.photoshootId).maybeSingle();
  if (lookup.error) throw new PaymentRequestError("PAYMENT_LOOKUP_FAILED", 500);
  if (!lookup.data || lookup.data.user_id !== input.userId) throw new PaymentRequestError("PHOTOSHOOT_NOT_FOUND", 404);
  if (lookup.data.status !== "pending" && lookup.data.status !== "awaiting_payment") {
    throw new PaymentRequestError("PHOTOSHOOT_NOT_PAYABLE", 409);
  }

  const photoshoot = lookup.data as PhotoshootPaymentRow;
  const amountMinor = amountMinorFromPhotoshoot(photoshoot);
  const pending = await admin.from("payments").select("*")
    .eq("photoshoot_id", input.photoshootId).eq("status", "pending").maybeSingle();
  if (pending.error) throw new PaymentRequestError("PAYMENT_LOOKUP_FAILED", 500);
  let payment = pending.data;
  if (payment && payment.payment_method !== input.paymentMethod) throw new PaymentRequestError("PAYMENT_METHOD_CONFLICT", 409);

  if (!payment) {
    const config = getYooKassaConfig();
    const created = await admin.from("payments").insert({
      user_id: input.userId,
      photoshoot_id: input.photoshootId,
      payment_method: input.paymentMethod,
      amount_minor: amountMinor,
      idempotency_key: randomUUID(),
      is_test_mode: config.isTestMode,
      attribution_snapshot: photoshoot.attribution_snapshot,
    }).select("*").single();

    if (created.error?.code === "23505") {
      const raced = await admin.from("payments").select("*")
        .eq("photoshoot_id", input.photoshootId).eq("status", "pending").maybeSingle();
      if (raced.error || !raced.data) throw new PaymentRequestError("PAYMENT_CREATE_FAILED", 500);
      payment = raced.data;
    } else if (created.error || !created.data) {
      throw new PaymentRequestError("PAYMENT_CREATE_FAILED", 500);
    } else {
      payment = created.data;
    }
  }

  const internalPayment = payment as PaymentRow;
  if (internalPayment.payment_method !== input.paymentMethod) {
    throw new PaymentRequestError("PAYMENT_METHOD_CONFLICT", 409);
  }
  if (internalPayment.amount_minor !== amountMinor || internalPayment.user_id !== input.userId) {
    throw new PaymentRequestError("PAYMENT_ATTEMPT_MISMATCH", 409);
  }

  const provider = await getYooKassaClient().createPayment({
    amountMinor: internalPayment.amount_minor,
    idempotencyKey: internalPayment.idempotency_key,
    paymentMethod: internalPayment.payment_method,
    returnUrl: paymentReturnUrl(internalPayment.id),
    description: `PhotoGen: ${photoshoot.style_id}`,
    metadata: { payment_id: internalPayment.id, photoshoot_id: photoshoot.id },
  });
  const confirmationUrl = provider.confirmation?.confirmation_url;
  if (!confirmationUrl) throw new YooKassaError("INVALID_PROVIDER_RESPONSE", "Missing confirmation URL");

  const updated = await admin.from("payments").update({
    provider_payment_id: provider.id,
    provider_snapshot: safeProviderSnapshot(provider),
  }).eq("id", internalPayment.id).eq("status", "pending").select("*").single();
  if (updated.error || !updated.data) throw new PaymentRequestError("PAYMENT_UPDATE_FAILED", 500);
  return { paymentId: updated.data.id, status: updated.data.status, confirmationUrl };
}

export async function getPaymentStatusForOwner(input: { userId: string; paymentId: string }) {
  const admin = createServiceRoleClient();
  const result = await admin.from("payments")
    .select("id,photoshoot_id,status,amount_minor,currency,payment_method,created_at,updated_at,paid_at")
    .eq("id", input.paymentId).eq("user_id", input.userId).maybeSingle();
  if (result.error) throw new PaymentRequestError("PAYMENT_LOOKUP_FAILED", 500);
  if (!result.data) throw new PaymentRequestError("PAYMENT_NOT_FOUND", 404);
  return result.data;
}
