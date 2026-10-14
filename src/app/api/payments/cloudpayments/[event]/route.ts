import { NextResponse } from "next/server";
import { parseCloudPaymentsBody, type CloudPaymentsNotificationType, verifyCloudPaymentsSignature } from "@/lib/payments/cloudpayments";
import { createServiceRoleClient } from "@/utils/supabase/admin";

const EVENTS = new Set<CloudPaymentsNotificationType>(["check", "pay", "fail"]);

export async function POST(request: Request, context: { params: Promise<{ event: string }> }) {
  const { event } = await context.params;
  if (!EVENTS.has(event as CloudPaymentsNotificationType)) {
    return NextResponse.json({ code: 13 }, { status: 404 });
  }
  const rawBody = await request.text();
  const signature = request.headers.get("content-hmac") ?? request.headers.get("x-content-hmac");
  if (!verifyCloudPaymentsSignature(rawBody, signature)) {
    return NextResponse.json({ code: 13 }, { status: 401 });
  }
  const notification = parseCloudPaymentsBody(rawBody);
  if (!notification) return NextResponse.json({ code: 13 });
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient.rpc("process_cloudpayments_notification", {
    p_notification_type: event,
    p_invoice_id: notification.invoiceId,
    p_provider_transaction_id: notification.transactionId,
    p_amount_minor: notification.amountMinor,
    p_currency: notification.currency,
  }).single();
  if (error || !data?.accepted) return NextResponse.json({ code: 13 });
  return NextResponse.json({ code: 0 });
}
