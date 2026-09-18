import { NextResponse } from "next/server";

import { YooKassaError } from "@/lib/payments/yookassa";
import {
  processYooKassaWebhook,
  YooKassaWebhookError,
} from "@/lib/payments/webhook";

function providerPaymentId(notification: unknown): string | null {
  if (!notification || typeof notification !== "object" || Array.isArray(notification)) return null;
  const object = (notification as { object?: unknown }).object;
  if (!object || typeof object !== "object" || Array.isArray(object)) return null;
  const id = (object as { id?: unknown }).id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

export async function POST(request: Request) {
  let notification: unknown;
  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_NOTIFICATION" }, { status: 400 });
  }

  const paymentId = providerPaymentId(notification);
  if (!paymentId) {
    return NextResponse.json({ error: "INVALID_NOTIFICATION" }, { status: 400 });
  }

  try {
    await processYooKassaWebhook(paymentId);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof YooKassaWebhookError || error instanceof YooKassaError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.error("YooKassa webhook processing failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
