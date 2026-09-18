export type YooKassaVatCode = 1 | 2 | 3 | 4 | 5 | 6;
export type YooKassaPaymentMode = "full_prepayment" | "partial_prepayment" | "advance" | "full_payment" | "partial_payment" | "credit" | "credit_payment";
export type YooKassaPaymentSubject = "commodity" | "excise" | "job" | "service" | "gambling_bet" | "gambling_prize" | "lottery" | "lottery_prize" | "intellectual_activity" | "payment" | "agent_commission" | "composite" | "another";
export type ReceiptFiscalSettings = { vatCode: YooKassaVatCode; paymentMode: YooKassaPaymentMode; paymentSubject: YooKassaPaymentSubject };
export type ReceiptCustomer = { email?: string; phone?: string };

export function buildYooKassaReceipt(input: {
  customer: ReceiptCustomer;
  description: string;
  amountMinor: number;
  fiscal: ReceiptFiscalSettings;
}) {
  if (!input.customer.email && !input.customer.phone) throw new Error("RECEIPT_CUSTOMER_REQUIRED");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("INVALID_RECEIPT_AMOUNT");
  if (!input.fiscal) throw new Error("RECEIPT_FISCAL_SETTINGS_REQUIRED");
  return {
    customer: input.customer,
    items: [{
      description: input.description,
      quantity: "1.00",
      amount: { value: (input.amountMinor / 100).toFixed(2), currency: "RUB" as const },
      vat_code: input.fiscal.vatCode,
      payment_mode: input.fiscal.paymentMode,
      payment_subject: input.fiscal.paymentSubject,
    }],
  };
}
