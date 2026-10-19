import type { Tone } from "@/lib/tones";

// =============================================================================
// Payment statuses, colors and provider forms (pure UI constants). Records come from the API.
// =============================================================================

export type SubscriptionStatus = "Active" | "Awaiting payment" | "Paused" | "Trial" | "Canceled";
export type InvoiceStatus = "Paid" | "Sent" | "Overdue" | "Draft" | "Void" | "Refunded";
export type BillingInterval = "Week" | "Month" | "Quarter" | "Year";

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["Active", "Awaiting payment", "Paused", "Trial", "Canceled"];
export const BILLING_INTERVALS: BillingInterval[] = ["Week", "Month", "Quarter", "Year"];

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

// ---------------------------------------------------------------- Providers
export type ProviderField = { key: string; label: string; placeholder: string; secret?: boolean; optional?: boolean };

export type PaymentProvider = {
  id: string;
  name: string;
  desc: string;
  initials: string;
  tone: Tone;
  /** Supports test / live mode. */
  hasMode: boolean;
  help: string;
  fields: ProviderField[];
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: "stripe", name: "Stripe", desc: "Cards, Apple Pay, Google Pay", initials: "St", tone: "indigo", hasMode: true,
    help: "Find these in your Stripe dashboard under Developers → API keys.",
    fields: [
      { key: "pub", label: "Publishable key", placeholder: "pk_live_…" },
      { key: "sec", label: "Secret key", placeholder: "sk_live_…", secret: true },
    ],
  },
  {
    id: "paypal", name: "PayPal", desc: "PayPal balance and cards", initials: "PP", tone: "sky", hasMode: true,
    help: "Create an app in the PayPal Developer dashboard to get your Client ID and Secret.",
    fields: [
      { key: "cid", label: "Client ID", placeholder: "A…" },
      { key: "sec", label: "Secret", placeholder: "••••", secret: true },
    ],
  },
  {
    id: "paymongo", name: "PayMongo", desc: "GCash, Maya, cards (PH)", initials: "PM", tone: "teal", hasMode: true,
    help: "Get your keys from the PayMongo dashboard under Developers.",
    fields: [
      { key: "pub", label: "Public key", placeholder: "pk_live_…" },
      { key: "sec", label: "Secret key", placeholder: "sk_live_…", secret: true },
    ],
  },
  {
    id: "square", name: "Square", desc: "Cards and in-person payments", initials: "Sq", tone: "neutral", hasMode: true,
    help: "Find these in the Square Developer dashboard for your application.",
    fields: [
      { key: "app", label: "Application ID", placeholder: "sq0idp-…" },
      { key: "tok", label: "Access token", placeholder: "••••", secret: true },
    ],
  },
  {
    id: "xendit", name: "Xendit", desc: "E-wallets and bank transfers (SEA)", initials: "Xe", tone: "purple", hasMode: true,
    help: "Generate an API key in the Xendit dashboard under Settings → API keys.",
    fields: [{ key: "sec", label: "Secret API key", placeholder: "xnd_…", secret: true }],
  },
  {
    id: "bank", name: "Bank transfer", desc: "Manual payment with your bank details", initials: "Bk", tone: "amber", hasMode: false,
    help: "Clients see these details at checkout and pay you directly. Mark the payment as paid when it arrives.",
    fields: [
      { key: "bank", label: "Bank name", placeholder: "e.g. BDO" },
      { key: "accName", label: "Account name", placeholder: "" },
      { key: "accNo", label: "Account number", placeholder: "" },
    ],
  },
  {
    id: "custom", name: "Custom / other", desc: "Any provider with a checkout link", initials: "+", tone: "brand", hasMode: false,
    help: "Paste your own checkout or payment link. Add a webhook URL if your provider can tell the CRM when someone pays.",
    fields: [
      { key: "label", label: "Provider name", placeholder: "e.g. Gumroad" },
      { key: "link", label: "Checkout link", placeholder: "https://…" },
      { key: "hook", label: "Webhook URL (optional)", placeholder: "https://…", optional: true },
    ],
  },
];
