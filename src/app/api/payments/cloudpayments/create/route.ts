import { NextResponse } from "next/server";
import { getCloudPaymentsPublicId } from "@/lib/env";
import { createClient } from "@/utils/supabase/server";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { photoshootId?: unknown } | null;
  if (!payload || typeof payload.photoshootId !== "string") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const { data, error } = await supabase
    .rpc("create_cloudpayments_payment", { p_photoshoot_id: payload.photoshootId });
  if (error || !data) return NextResponse.json({ error: "PAYMENT_CREATE_REJECTED" }, { status: 409 });
  return NextResponse.json({
    publicId: getCloudPaymentsPublicId(), invoiceId: data.id,
    amount: data.amount_minor / 100, currency: data.currency,
    description: "PhotoGen photoshoot",
  });
}
