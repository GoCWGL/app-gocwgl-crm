import type { VaRequestIn, VaRequestOut } from "@/utils/api/models";

/**
 * The VA agreement a client accepts before requesting a VA: a monthly maintenance fee by hours a week (an open
 * project is quoted by GoCWGL). The server keeps the same table and records when they accepted and the fee.
 */
export const VA_MAINTENANCE_FEE_DOLLARS: Record<10 | 20 | 40, number> = { 10: 20, 20: 40, 40: 80 };

/** "$40 a month", or how an open project is priced. */
export function maintenanceFeeLabel(hours: number | null | undefined): string {
  const fee = hours ? VA_MAINTENANCE_FEE_DOLLARS[hours as 10 | 20 | 40] : undefined;
  return fee ? `$${fee} a month` : "Quoted by GoCWGL";
}

// Until the API types are regenerated, the agreement fields are typed here.
export type VaRequestWithAgreementIn = VaRequestIn & { agreementAccepted?: boolean };
export type VaRequestAgreement = { agreementAcceptedAt?: string | null; agreementFeeCents?: number | null };
export const agreementOf = (r: VaRequestOut) => r as VaRequestOut & VaRequestAgreement;

/**
 * A request's monthly maintenance fee, for staff billing it: the fee the client agreed to, or (requests from before
 * the agreement, or added by GoCWGL) the standard fee for its hours. `cents` is null for an open project (quoted).
 */
export function maintenanceFeeOf(r: VaRequestOut): { cents: number | null; label: string; agreed: boolean; acceptedAt: string | null } {
  const a = agreementOf(r);
  const agreed = !!a.agreementAcceptedAt;
  const standard = r.engagement !== "project" && r.hoursPerWeek ? VA_MAINTENANCE_FEE_DOLLARS[r.hoursPerWeek as 10 | 20 | 40] : undefined;
  const cents = agreed ? (a.agreementFeeCents ?? null) : standard ? standard * 100 : null;
  return { cents, label: cents ? `$${cents / 100} a month` : "Quoted by GoCWGL", agreed, acceptedAt: a.agreementAcceptedAt ?? null };
}

/** Requests whose VA is working for the client: the ones billed the maintenance fee each month. */
export const isBilledRequest = (r: VaRequestOut) => r.status === "matched";
