import type { Tone } from "@/lib/tones";
import type { BonusStatus, CrmPackage, CrmProgress, PayoutIn, PayoutMethod, PayoutOut } from "@/utils/api/models";

// =============================================================================
// Affiliate program copy shared by the admin CRM and the client portal.
// =============================================================================

/** Where a referred client is with their CRM. The bonus is earned at "paid". */
export const CRM_PROGRESS: Record<CrmProgress, { label: string; tone: Tone }> = {
  none: { label: "No CRM yet", tone: "neutral" },
  requested: { label: "CRM requested", tone: "cyan" },
  invoiced: { label: "CRM invoiced", tone: "amber" },
  paid: { label: "CRM paid", tone: "green" },
};

export const CRM_PACKAGE_LABELS: Record<CrmPackage, string> = { simple: "Simple CRM", custom: "Custom CRM" };

/** The ways to be paid a bonus on offer. */
export const PAYOUT_METHODS: Array<{ value: PayoutIn["method"]; label: string }> = [
  { value: "wise", label: "Wise" },
  { value: "bank", label: "Bank transfer" },
];
export const payoutMethodLabel = (m: PayoutMethod) => PAYOUT_METHODS.find((x) => x.value === m)?.label ?? (m === "paypal" ? "PayPal" : m);

/** Where to start when changing saved details: PayPal (no longer offered) becomes Wise. */
export const offeredMethod = (p: PayoutOut): PayoutIn["method"] => (p.method === "paypal" ? "wise" : p.method);

export const BONUS_STATUS: Record<BonusStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  earned: { label: "Earned · to be paid", tone: "amber" },
  paid: { label: "Bonus paid", tone: "green" },
};

/** "4 of 12 payments" while a referred client pays for their CRM monthly; "" otherwise. */
export const crmPayments = (r: { crmPaymentsPaid: number; crmPaymentsTotal: number }) =>
  r.crmPaymentsTotal > 1 ? `${r.crmPaymentsPaid} of ${r.crmPaymentsTotal} payments` : "";

/** Where a referred client's CRM bonus is, as the referrer reads it: in progress until they've fully paid, then claimed, then paid. */
export function crmBonusState(r: { bonusStatus: BonusStatus; claimedAt: string | null; crm: CrmProgress }): { key: "none" | "progress" | "earned" | "claimed" | "paid"; label: string; tone: Tone } {
  if (r.bonusStatus === "paid") return { key: "paid", label: "Bonus paid", tone: "green" };
  if (r.bonusStatus === "earned") return r.claimedAt ? { key: "claimed", label: "Claimed", tone: "cyan" } : { key: "earned", label: "Ready to claim", tone: "amber" };
  return r.crm === "none" ? { key: "none", label: "No CRM yet", tone: "neutral" } : { key: "progress", label: "In progress", tone: "purple" };
}

/** Where a referred client's VA bonus is: earned at 30 days of 8+ hours by their hourly VAs, then claimed, then paid. */
export function vaBonusState(r: { vaBonusStatus: BonusStatus; vaClaimedAt: string | null; vaHired: boolean }): { key: "none" | "counting" | "earned" | "claimed" | "paid"; label: string; tone: Tone } {
  if (r.vaBonusStatus === "paid") return { key: "paid", label: "Bonus paid", tone: "green" };
  if (r.vaBonusStatus === "earned")
    return r.vaClaimedAt ? { key: "claimed", label: "Claimed", tone: "cyan" } : { key: "earned", label: "Ready to claim", tone: "amber" };
  return r.vaHired ? { key: "counting", label: "Counting down", tone: "purple" } : { key: "none", label: "No hourly VA yet", tone: "neutral" };
}

/** The link a client shares: opens sign-up with their referral ID filled in. */
export function referralLink(code: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/login?ref=${encodeURIComponent(code)}`;
}

/** Generated IDs use these characters only (no 0/O, 1/I/L); custom ones the team sets may use any letters and numbers. */
const GENERATED_ID = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/;

/** A generated "K7M2Q9XA" → "K7M2-Q9XA", easier to read out; custom IDs ("RILEY500") as they are. Sign-up accepts either. */
export function formatReferralCode(code: string): string {
  return GENERATED_ID.test(code) ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
