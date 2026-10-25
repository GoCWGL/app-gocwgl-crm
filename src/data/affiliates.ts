import type { Tone } from "@/lib/tones";
import type { BonusStatus, CrmProgress } from "@/utils/api/models";

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

/** "K7M2Q9XA" → "K7M2-Q9XA", easier to read out. Sign-up accepts either. */
export function formatReferralCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
