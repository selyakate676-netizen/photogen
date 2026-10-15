import "server-only";

import { logGenerationEvent } from "@/lib/ai/generation-log";
import { startQueuedPhotoshootGenerationFromPayment } from "@/lib/photoshoots/orchestration";
import { createServiceRoleClient } from "@/utils/supabase/admin";

const RECOVERY_AGE_MS = 15 * 60 * 1000;
const DEFAULT_RUN_BUDGET_MS = 50_000;
const DEFAULT_RECOVERY_LIMIT = 10;
const DEFAULT_START_LIMIT = 1;

type LinkedPhotoshoot = {
  id: string;
  status: string;
  payment_source: string | null;
  payment_id: string | null;
};

export type CloudPaymentsGenerationRunSummary = {
  recovered: number;
  started: number;
  failed: number;
  needsManualAttention: number;
  deadlineReached: boolean;
};

export async function runCloudPaymentsGenerationWorker(options: {
  now?: Date;
  runBudgetMs?: number;
  recoveryLimit?: number;
  startLimit?: number;
} = {}): Promise<CloudPaymentsGenerationRunSummary> {
  const now = options.now ?? new Date();
  const runBudgetMs = options.runBudgetMs ?? DEFAULT_RUN_BUDGET_MS;
  const recoveryLimit = options.recoveryLimit ?? DEFAULT_RECOVERY_LIMIT;
  const startLimit = options.startLimit ?? DEFAULT_START_LIMIT;
  const deadline = Date.now() + runBudgetMs;
  const supabase = createServiceRoleClient();
  const summary: CloudPaymentsGenerationRunSummary = {
    recovered: 0,
    started: 0,
    failed: 0,
    needsManualAttention: 0,
    deadlineReached: false,
  };

  const staleBefore = new Date(now.getTime() - RECOVERY_AGE_MS).toISOString();
  const { data: recoverable, error: recoveryScanError } = await supabase
    .from("photoshoots")
    .select("id")
    .eq("payment_source", "rub")
    .eq("status", "generating")
    .eq("provider_dispatch_state", "not_started")
    .lte("generation_claimed_at", staleBefore)
    .order("generation_claimed_at", { ascending: true })
    .limit(recoveryLimit);

  if (recoveryScanError) throw new Error("RUB_RECOVERY_SCAN_FAILED");

  for (const photoshoot of recoverable ?? []) {
    if (Date.now() >= deadline) {
      summary.deadlineReached = true;
      break;
    }

    const { data: recovered, error } = await supabase.rpc("recover_rub_generation_pre_provider", {
      p_photoshoot_id: photoshoot.id,
    });
    if (error) {
      summary.failed += 1;
      logGenerationEvent("error", "rub_pre_provider_recovery_failed", "claim", photoshoot.id, "RECOVERY_ERROR");
    } else if (recovered === true) {
      summary.recovered += 1;
      logGenerationEvent("info", "rub_pre_provider_recovered", "claim", photoshoot.id);
    }
  }

  const { count: needsManualAttention, error: attentionScanError } = await supabase
    .from("photoshoots")
    .select("id", { count: "exact", head: true })
    .eq("payment_source", "rub")
    .eq("status", "generating")
    .in("provider_dispatch_state", ["dispatching", "ambiguous"])
    .lte("generation_claimed_at", staleBefore);

  if (attentionScanError) throw new Error("RUB_ATTENTION_SCAN_FAILED");
  summary.needsManualAttention = needsManualAttention ?? 0;
  if (summary.needsManualAttention > 0) {
    console.warn("[generation]", JSON.stringify({
      event: "rub_generation_manual_attention_required",
      stage: "provider_call",
      count: summary.needsManualAttention,
    }));
  }

  if (Date.now() >= deadline) {
    summary.deadlineReached = true;
    return summary;
  }

  const { data: payments, error: queueScanError } = await supabase
    .from("cloudpayments_payments")
    .select("id,photoshoot_id,photoshoots!cloudpayments_payments_photoshoot_id_fkey!inner(id,status,payment_source,payment_id)")
    .eq("purchase_type", "direct_photoshoot")
    .eq("provider", "cloudpayments")
    .eq("status", "succeeded")
    .eq("photoshoots.status", "queued")
    .eq("photoshoots.payment_source", "rub")
    .order("paid_at", { ascending: true })
    .limit(startLimit);

  if (queueScanError) throw new Error("RUB_GENERATION_QUEUE_SCAN_FAILED");

  for (const payment of payments ?? []) {
    if (Date.now() >= deadline) {
      summary.deadlineReached = true;
      break;
    }

    const linked = payment.photoshoots as unknown as LinkedPhotoshoot;
    if (!payment.photoshoot_id || linked.id !== payment.photoshoot_id || linked.payment_id !== payment.id) {
      continue;
    }

    try {
      await startQueuedPhotoshootGenerationFromPayment(linked.id);
      summary.started += 1;
    } catch {
      summary.failed += 1;
      logGenerationEvent("error", "rub_generation_worker_failed", "provider_call", linked.id, "PROVIDER_ERROR");
    }
  }

  return summary;
}
