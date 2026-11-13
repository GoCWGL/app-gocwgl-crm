import type { PaymentMethodOut, VaInvoiceRow } from "@/utils/api/models";

export type InvoiceStatus = VaInvoiceRow["status"];
export type MethodKind = PaymentMethodOut["kind"];

export const STATUS: Record<InvoiceStatus, { label: string; tone: "slate" | "sky" | "green" }> = {
  draft: { label: "Draft", tone: "slate" },
  sent: { label: "Sent", tone: "sky" },
  paid: { label: "Paid", tone: "green" },
};

export const METHOD_KINDS: Array<{ value: MethodKind; label: string; hint: string }> = [
  { value: "bank", label: "Bank transfer", hint: "Bank name, account number, SWIFT / routing" },
  { value: "paypal", label: "PayPal", hint: "Your PayPal email" },
  { value: "wise", label: "Wise", hint: "Your Wise email or account details" },
  { value: "gcash", label: "GCash", hint: "Your GCash number" },
  { value: "payoneer", label: "Payoneer", hint: "Your Payoneer email" },
  { value: "other", label: "Other", hint: "How clients can pay you" },
];
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
