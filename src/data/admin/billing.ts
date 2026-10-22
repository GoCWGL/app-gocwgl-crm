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
