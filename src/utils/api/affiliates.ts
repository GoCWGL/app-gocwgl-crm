import { del, get, patch, post, put } from "./client";
import type {
  AdminPayoutOut,
  AffiliateDetailOut,
  AffiliateOut,
  AffiliatePatch,
  ContactReferrerOut,
  AffiliateProgramOut,
  AffiliateProgramUpdate,
  PayoutIn,
  PayoutOut,
  PortalAffiliateOut,
  ReferralIn,
  ReferralOut,
  ReferralPatch,
  ReferredByOut,
} from "./models";

// ------------------------------------------------------------------ Portal: the client's referral ID and referrals
export const getMyAffiliate = () => get<PortalAffiliateOut>("/portal/affiliate");
/** Where the client wants bonuses sent (portal owner only). */
export const saveMyPayout = (body: PayoutIn) => put<PayoutOut>("/portal/affiliate/payout", body);
export const removeMyPayout = () => del("/portal/affiliate/payout");
/** Who referred this client, and until when they can still add it (48 hours after creating their account). */
export const getReferredBy = () => get<ReferredByOut>("/portal/referred-by");
export const addReferrer = (referralCode: string) => post<ReferredByOut>("/portal/referred-by", { referralCode });

// ------------------------------------------------------------------ Admin: the program and every referral
export const getAffiliateProgram = () => get<AffiliateProgramOut>("/admin/affiliates/program");
export const updateAffiliateProgram = (body: AffiliateProgramUpdate) => patch<AffiliateProgramOut>("/admin/affiliates/program", body);

/** Every client eligible for the program (Paid subscriber stage), removed ones included. */
export const listAffiliates = () => get<AffiliateOut[]>("/admin/affiliates");
export const getAffiliate = (contactId: string) => get<AffiliateDetailOut>(`/admin/affiliates/${contactId}`);
/** Change their referral ID, or `removed: true / false` to remove them from the program or restore them. */
export const updateAffiliate = (contactId: string, body: AffiliatePatch) => patch<AffiliateDetailOut>(`/admin/affiliates/${contactId}`, body);
export const setAffiliatePayout = (contactId: string, body: PayoutIn) => put<PayoutOut>(`/admin/affiliates/${contactId}/payout`, body);
export const removeAffiliatePayout = (contactId: string) => del(`/admin/affiliates/${contactId}/payout`);

/** Who referred a contact (their CRM profile). */
export const getContactReferrer = (contactId: string) => get<ContactReferrerOut>(`/admin/referred-by/${contactId}`);
/** Super admins only: set, change or clear (`null`) who referred a contact. */
export const setContactReferrer = (contactId: string, referrerContactId: string | null) =>
  put<ContactReferrerOut>(`/admin/referred-by/${contactId}`, { referrerContactId });

export const listReferrals = () => get<ReferralOut[]>("/admin/referrals");
/** Link a client to whoever referred them (e.g. they signed up with Google). */
export const createReferral = (body: ReferralIn) => post<ReferralOut>("/admin/referrals", body);
/** `bonusCents: null` goes back to the program's bonus. */
export const updateReferral = (id: string, body: ReferralPatch) => patch<ReferralOut>(`/admin/referrals/${id}`, body);
/** Only once the referred client has paid for their CRM. */
export const markBonusPaid = (id: string) => post<ReferralOut>(`/admin/referrals/${id}/bonus-paid`);
export const undoBonusPaid = (id: string) => del<ReferralOut>(`/admin/referrals/${id}/bonus-paid`);
/** Full payout details for sending a bonus (owners and admins; audited). */
export const getPayoutDetails = (contactId: string) => get<AdminPayoutOut>(`/admin/affiliates/payouts/${contactId}`);
export const deleteReferral = (id: string) => del(`/admin/referrals/${id}`);
