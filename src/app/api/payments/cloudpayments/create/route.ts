import { NextResponse } from "next/server";
import { getCloudPaymentsPublicId } from "@/lib/env";
import { isCloudPaymentsRubCheckoutAllowed } from "@/lib/payments/cloudpayments-gate";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!isCloudPaymentsRubCheckoutAllowed(user.id)) {
    return NextResponse.json({ error: "RUB_CHECKOUT_NOT_AVAILABLE" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null) as { photoshootId?: unknown } | null;
  if (!payload || typeof payload.photoshootId !== "string") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const { data: photoshoot, error: photoshootError } = await supabase
    .from("photoshoots")
    .select("id")
    .eq("id", payload.photoshootId)
    .eq("user_id", user.id)
    .single();
  if (photoshootError || !photoshoot) {
    return NextResponse.json({ error: "PHOTOSHOOT_NOT_FOUND" }, { status: 404 });
  }
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient.rpc("create_cloudpayments_payment", {
    p_photoshoot_id: photoshoot.id,
    p_user_id: user.id,
  });
  if (error || !data) return NextResponse.json({ error: "PAYMENT_CREATE_REJECTED" }, { status: 409 });
  return NextResponse.json({
    publicId: getCloudPaymentsPublicId(), invoiceId: data.id,
    amount: data.amount_minor / 100, currency: data.currency,
    accountId: user.id,
    description: "PhotoGen photoshoot",
  });
}
