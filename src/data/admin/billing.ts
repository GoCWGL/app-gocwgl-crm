import type { Tone } from "@/lib/tones";

// =============================================================================
// Payment statuses and colors (pure UI constants). Records come from the API.
// =============================================================================

export type SubscriptionStatus = "Active" | "Awaiting payment" | "Paused" | "Trial" | "Canceled";
export type InvoiceStatus = "Paid" | "Sent" | "Overdue" | "Draft" | "Void" | "Refunded";
export type BillingInterval = "Week" | "Month" | "Quarter" | "Year";

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["Active", "Awaiting payment", "Paused", "Trial", "Canceled"];
export const BILLING_INTERVALS: BillingInterval[] = ["Week", "Month", "Quarter", "Year"];

/** The yearly plan for backend services and hosting. The API invoices it (with its Wise link) every year until cancelled. */
export const HOSTING_PLAN = { plan: "Hosting & backend services", amountCents: 9_700, interval: "Year" as BillingInterval };

export const SUBSCRIPTION_TONES: Record<SubscriptionStatus, Tone> = {
  Active: "green",
  "Awaiting payment": "amber",
  Paused: "neutral",
  Trial: "purple",
  Canceled: "slate",
};

export const INVOICE_TONES: Record<InvoiceStatus, Tone> = {
  Paid: "green",
  Sent: "cyan",
  Overdue: "red",
  Draft: "neutral",
  Void: "slate",
  Refunded: "purple",
};

/** How a client pays through an invoice's payment link (the API's PaymentMethod keys). */
export type PaymentMethod = "wise" | "paypal" | "stripe" | "paymongo" | "square" | "xendit" | "gcash" | "bank" | "other";
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "wise", label: "Wise" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "paymongo", label: "PayMongo" },
  { value: "square", label: "Square" },
  { value: "xendit", label: "Xendit" },
  { value: "gcash", label: "GCash" },
  { value: "bank", label: "Bank transfer" },
  { value: "other", label: "Other" },
];
export const paymentMethodLabel = (m?: string | null) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? "Payment link";
/** The API only accepts https links, so the email never carries an unsafe one. */
export const isPayUrl = (url: string) => /^https:\/\/\S+$/.test(url.trim());
