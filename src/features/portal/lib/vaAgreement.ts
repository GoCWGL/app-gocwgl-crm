import type { VaRequestIn, VaRequestOut } from "@/utils/api/models";

/**
 * The VA agreement a client accepts before requesting a VA: a monthly maintenance fee by hours a week (an open
 * project has none: GoCWGL quotes its payment), plus a training fee of $1 for each hour the VA works during the first
 * 6 months after the match. That $1 comes out of the VA's rate (their invoice takes it off), so the client's total for
 * the hours stays the same. The server keeps the same numbers and records when they accepted and the fees.
 */
export const VA_MAINTENANCE_FEE_DOLLARS: Record<10 | 20 | 40, number> = { 10: 25, 20: 45, 40: 75 };
export const VA_TRAINING_FEE_DOLLARS_PER_HOUR = 1;
export const VA_TRAINING_MONTHS = 6;

/** "$75 a month", or an open project's (none: GoCWGL quotes the project's payment). */
export function maintenanceFeeLabel(hours: number | null | undefined): string {
  const fee = hours ? VA_MAINTENANCE_FEE_DOLLARS[hours as 10 | 20 | 40] : undefined;
  return fee ? `$${fee} a month` : "No maintenance fee";
}

/** The short form of the training fee: "+ $1/hr of VA time for the first 6 months". */
export const TRAINING_FEE_SHORT = `+ $${VA_TRAINING_FEE_DOLLARS_PER_HOUR}/hr of VA time for the first ${VA_TRAINING_MONTHS} months`;

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * The training fee for a match: "+ $1/hr of VA time until May 18, 2027" once the VA is matched (`endsOn` set), the
 * short form before that, "$1/hr training fee ended …" after it, and "" when there's none.
 */
export function trainingFeeLabel(hourlyCents: number | null | undefined, endsOn: string | null | undefined): string {
  if (!hourlyCents) return "";
  const rate = `$${(hourlyCents / 100).toFixed(hourlyCents % 100 ? 2 : 0)}/hr`;
  if (!endsOn) return `+ ${rate} of VA time for the first ${VA_TRAINING_MONTHS} months`;
  return new Date(`${endsOn}T12:00:00Z`).getTime() > Date.now()
    ? `+ ${rate} of VA time until ${dayLabel(endsOn)}`
    : `${rate} training fee ended ${dayLabel(endsOn)}`;
}

/** The training fee still applies (a matched VA inside the first 6 months). */
export const trainingFeeActive = (hourlyCents: number | null | undefined, endsOn: string | null | undefined) =>
  !!hourlyCents && !!endsOn && new Date(`${endsOn}T12:00:00Z`).getTime() > Date.now();

// Until the API types are regenerated, the agreement fields are typed here.
export type VaRequestWithAgreementIn = VaRequestIn & { agreementAccepted?: boolean };
export type VaRequestAgreement = { agreementAcceptedAt?: string | null; agreementFeeCents?: number | null };
export const agreementOf = (r: VaRequestOut) => r as VaRequestOut & VaRequestAgreement;

/**
 * A request's fees, for staff billing them: the monthly maintenance fee the client agreed to, or (requests from before
 * the agreement, or added by GoCWGL) the standard fee for its hours, plus the agreed training fee. `cents` is null for
 * an open project (no maintenance fee).
 */
export function maintenanceFeeOf(r: VaRequestOut): {
  cents: number | null;
  label: string;
  /** The training fee in the agreement, cents per VA hour (null = none, e.g. agreements from before it). */
  hourlyCents: number | null;
  /** "+ $1/hr of VA time until …", or "" when there's no training fee. */
  hourlyLabel: string;
  agreed: boolean;
  acceptedAt: string | null;
} {
  const a = agreementOf(r);
  const agreed = !!a.agreementAcceptedAt;
  const standard = r.engagement !== "project" && r.hoursPerWeek ? VA_MAINTENANCE_FEE_DOLLARS[r.hoursPerWeek as 10 | 20 | 40] : undefined;
  const cents = agreed ? (a.agreementFeeCents ?? null) : standard ? standard * 100 : null;
  const hourlyCents = agreed ? (r.agreementHourlyCents ?? null) : null;
  return {
    cents,
    label: cents ? `$${cents / 100} a month` : r.engagement === "project" ? "No maintenance fee" : "Quoted by GoCWGL",
    hourlyCents,
    hourlyLabel: trainingFeeLabel(hourlyCents, r.hourlyFeeEndsOn),
    agreed,
    acceptedAt: a.agreementAcceptedAt ?? null,
  };
}

/** Requests whose VA is working for the client: the ones billed the maintenance fee each month. */
export const isBilledRequest = (r: VaRequestOut) => r.status === "matched";
