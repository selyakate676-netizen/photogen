import { NextResponse } from "next/server";
import { getPaymentStatusForOwner, PaymentRequestError } from "@/lib/payments/service";
import { UUID_RE } from "@/lib/personas/api";
import { createClient } from "@/utils/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  try {
    const payment = await getPaymentStatusForOwner({ userId: user.id, paymentId: id });
    return NextResponse.json({ payment }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PaymentRequestError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("Payment status lookup failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "PAYMENT_LOOKUP_FAILED" }, { status: 500 });
  }
}
