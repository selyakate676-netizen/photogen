export type PaymentPollStatus = "pending" | "succeeded" | "canceled";
export type PaymentPollDecision = "continue" | "succeeded" | "canceled" | "error";

export function decidePaymentPoll(
  status: PaymentPollStatus | null,
  attempt: number,
  maxAttempts: number,
): PaymentPollDecision {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  return attempt < maxAttempts ? "continue" : "error";
}
