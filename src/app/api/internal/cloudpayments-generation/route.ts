import { NextResponse } from "next/server";

import { verifyCloudPaymentsCronAuthorization } from "@/lib/payments/cloudpayments-cron-auth";
import { runCloudPaymentsGenerationWorker } from "@/lib/payments/cloudpayments-generation-worker";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let authorized = false;
  try {
    authorized = verifyCloudPaymentsCronAuthorization(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }

  if (!authorized) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const summary = await runCloudPaymentsGenerationWorker();
    return NextResponse.json(summary);
  } catch {
    console.error("[generation]", JSON.stringify({
      event: "rub_generation_worker_run_failed",
      stage: "photoshoot",
      error_code: "WORKER_ERROR",
    }));
    return NextResponse.json({ error: "WORKER_FAILED" }, { status: 500 });
  }
}
