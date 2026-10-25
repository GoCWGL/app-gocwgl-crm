import type { Tone } from "@/lib/tones";
import type { BonusStatus, CrmPackage, CrmProgress, PayoutMethod } from "@/utils/api/models";

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

export const PAYOUT_METHODS: Array<{ value: PayoutMethod; label: string }> = [
  { value: "wise", label: "Wise" },
  { value: "paypal", label: "PayPal" },
  { value: "bank", label: "Bank transfer" },
];
export const payoutMethodLabel = (m: PayoutMethod) => PAYOUT_METHODS.find((x) => x.value === m)?.label ?? m;

export const BONUS_STATUS: Record<BonusStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  earned: { label: "Earned · to be paid", tone: "amber" },
  paid: { label: "Bonus paid", tone: "green" },
};

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
