import type { PaymentMethodOut, VaInvoiceRow } from "@/utils/api/models";

export type InvoiceStatus = VaInvoiceRow["status"];
export type MethodKind = PaymentMethodOut["kind"];

export const STATUS: Record<InvoiceStatus, { label: string; tone: "slate" | "sky" | "green" }> = {
  draft: { label: "Draft", tone: "slate" },
  sent: { label: "Sent", tone: "sky" },
  paid: { label: "Paid", tone: "green" },
};

/**
 * Each way to get paid and what it asks for. Bank transfers need the bank name and account number; the others an
 * account number (or email / phone) or a payment link.
 */
export type MethodKindInfo = {
  value: MethodKind;
  label: string;
  /** What "account number" means for it ("PayPal email", "GCash number"). */
  number: string;
  numberPlaceholder: string;
  /** Takes a payment link (Wise, PayPal.me…). */
  link: boolean;
  linkPlaceholder?: string;
  /** What else goes in "Other details". */
  detailsHint: string;
};

export const METHOD_KINDS: MethodKindInfo[] = [
  { value: "bank", label: "Bank transfer", number: "Account number", numberPlaceholder: "0123 4567 89", link: false, detailsHint: "SWIFT / BIC, branch, routing number…" },
  {
    value: "wise",
    label: "Wise",
    number: "Wise email or account number",
    numberPlaceholder: "you@email.com",
    link: true,
    linkPlaceholder: "https://wise.com/pay/me/yourname",
    detailsHint: "Anything else the client needs",
  },
  {
    value: "paypal",
    label: "PayPal",
    number: "PayPal email",
    numberPlaceholder: "you@email.com",
    link: true,
    linkPlaceholder: "https://paypal.me/yourname",
    detailsHint: "Anything else the client needs",
  },
  { value: "gcash", label: "GCash", number: "GCash number", numberPlaceholder: "0917 123 4567", link: false, detailsHint: "Anything else the client needs" },
  {
    value: "payoneer",
    label: "Payoneer",
    number: "Payoneer email",
    numberPlaceholder: "you@email.com",
    link: true,
    linkPlaceholder: "https://link.payoneer.com/…",
    detailsHint: "Anything else the client needs",
  },
  { value: "other", label: "Other", number: "Account number or ID", numberPlaceholder: "", link: true, linkPlaceholder: "https://…", detailsHint: "How clients can pay you" },
];
export const kindInfo = (k: string) => METHOD_KINDS.find((m) => m.value === k) ?? METHOD_KINDS[METHOD_KINDS.length - 1];
export const kindLabel = (k: string) => METHOD_KINDS.find((m) => m.value === k)?.label ?? k;

const md = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const yr = (iso: string) => iso.slice(0, 4);

/** "Oct 19 – 25, 2026", "Oct 26 – Nov 1, 2026", "Dec 28, 2025 – Jan 3, 2026". */
export function periodLabel(start: string, end: string): string {
  if (start === end) return `${md(start)}, ${yr(start)}`;
  if (yr(start) !== yr(end)) return `${md(start)}, ${yr(start)} – ${md(end)}, ${yr(end)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${md(start)} – ${Number(end.slice(8))}, ${yr(end)}`;
  return `${md(start)} – ${md(end)}, ${yr(end)}`;
}

/** 97200 → "27h" (or "27.5h"). */
export const hoursLabel = (seconds: number) => `${Math.round((seconds / 3600) * 10) / 10}h`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
