import { NextResponse } from "next/server";
import { createOrReuseYooKassaPayment, PaymentRequestError } from "@/lib/payments/service";
import type { PaymentMethod } from "@/lib/payments/types";
import { UUID_RE } from "@/lib/personas/api";
import { createClient } from "@/utils/supabase/server";

const PAYMENT_METHODS = new Set<PaymentMethod>(["bank_card", "sbp"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { photoshoot_id, payment_method } = body as Record<string, unknown>;
  if (typeof photoshoot_id !== "string" || !UUID_RE.test(photoshoot_id)
      || typeof payment_method !== "string" || !PAYMENT_METHODS.has(payment_method as PaymentMethod)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const payment = await createOrReuseYooKassaPayment({ userId: user.id, photoshootId: photoshoot_id, paymentMethod: payment_method as PaymentMethod });
    return NextResponse.json(payment, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PaymentRequestError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("YooKassa payment creation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "PAYMENT_PROVIDER_FAILED" }, { status: 502 });
  }
}
