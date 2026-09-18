import type { Json, PaymentStatus } from "@/types/database";

export type PaymentMethod = "bank_card" | "sbp";
export type YooKassaPaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled";
export type CreatePaymentInput = { photoshootId: string; paymentMethod: PaymentMethod };
export type CreatePaymentOutput = { paymentId: string; status: PaymentStatus; confirmationUrl: string };
export type YooKassaPayment = {
  id: string;
  status: YooKassaPaymentStatus;
  paid?: boolean;
  test?: boolean;
  created_at?: string;
  expires_at?: string;
  confirmation?: { type: "redirect"; confirmation_url?: string };
  payment_method?: { type?: string };
};
export type YooKassaCreatePaymentInput = {
  amountMinor: number;
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  returnUrl: string;
  description: string;
  metadata: Record<string, string>;
  receipt?: Json;
};
