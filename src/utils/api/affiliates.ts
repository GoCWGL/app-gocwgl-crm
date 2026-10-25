import { del, get, patch, post } from "./client";
import type {
  AffiliateProgramOut,
  AffiliateProgramUpdate,
  PortalAffiliateOut,
  ReferralIn,
  ReferralOut,
  ReferralPatch,
} from "./models";

// ------------------------------------------------------------------ Portal: the client's referral ID and referrals
export const getMyAffiliate = () => get<PortalAffiliateOut>("/portal/affiliate");

// ------------------------------------------------------------------ Admin: the program and every referral
export const getAffiliateProgram = () => get<AffiliateProgramOut>("/admin/affiliates/program");
export const updateAffiliateProgram = (body: AffiliateProgramUpdate) => patch<AffiliateProgramOut>("/admin/affiliates/program", body);

export const listReferrals = () => get<ReferralOut[]>("/admin/referrals");
/** Link a client to whoever referred them (e.g. they signed up with Google). */
export const createReferral = (body: ReferralIn) => post<ReferralOut>("/admin/referrals", body);
/** `bonusCents: null` goes back to the program's bonus. */
export const updateReferral = (id: string, body: ReferralPatch) => patch<ReferralOut>(`/admin/referrals/${id}`, body);
/** Only once the referred client has paid for their CRM. */
export const markBonusPaid = (id: string) => post<ReferralOut>(`/admin/referrals/${id}/bonus-paid`);
export const undoBonusPaid = (id: string) => del<ReferralOut>(`/admin/referrals/${id}/bonus-paid`);
export const deleteReferral = (id: string) => del(`/admin/referrals/${id}`);
