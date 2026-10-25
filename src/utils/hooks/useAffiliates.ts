"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/affiliates";
import type { AffiliatePatch, AffiliateProgramUpdate, PayoutIn, ReferralIn, ReferralPatch } from "@/utils/api/models";
import { qk } from "./keys";
import { useCanUseMenu } from "./useUsers";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Portal
export const useMyAffiliate = () => useQuery({ queryKey: qk.portalAffiliate, queryFn: api.getMyAffiliate });
export const useSaveMyPayout = () => useApiMutation((body: PayoutIn) => api.saveMyPayout(body), { invalidate: [qk.portalAffiliate] });
export const useReferredBy = () => useQuery({ queryKey: qk.referredBy, queryFn: api.getReferredBy });
export const useAddReferrer = () => useApiMutation(api.addReferrer, { invalidate: [qk.referredBy] });
export const useRemoveMyPayout = () => useApiMutation(api.removeMyPayout, { invalidate: [qk.portalAffiliate] });

// ------------------------------------------------------------------ Admin
/** The program's bonus shows on every referral that has no amount of its own, so both refresh together. */
const ALL = [qk.referrals, qk.affiliateProgram, qk.affiliates];

// Affiliates data: not requested for teammates without the Affiliates menu.
export const useAffiliateProgram = () =>
  useQuery({ queryKey: qk.affiliateProgram, queryFn: api.getAffiliateProgram, enabled: useCanUseMenu("affiliates") });
export const useUpdateAffiliateProgram = () => useApiMutation((body: AffiliateProgramUpdate) => api.updateAffiliateProgram(body), { invalidate: ALL });

export const useAffiliates = () => useQuery({ queryKey: qk.affiliates, queryFn: api.listAffiliates, enabled: useCanUseMenu("affiliates") });
export const useAffiliate = (contactId: string) => {
  const allowed = useCanUseMenu("affiliates");
  return useQuery({ queryKey: qk.affiliate(contactId), queryFn: () => api.getAffiliate(contactId), enabled: !!contactId && allowed });
};
export const useUpdateAffiliate = () =>
  useApiMutation((v: { contactId: string; body: AffiliatePatch }) => api.updateAffiliate(v.contactId, v.body), { invalidate: ALL });
export const useSetAffiliatePayout = () =>
  useApiMutation((v: { contactId: string; body: PayoutIn }) => api.setAffiliatePayout(v.contactId, v.body), { invalidate: ALL });
export const useRemoveAffiliatePayout = () => useApiMutation(api.removeAffiliatePayout, { invalidate: ALL });

export const useContactReferrer = (contactId: string) => {
  const allowed = useCanUseMenu("affiliates");
  return useQuery({ queryKey: qk.contactReferrer(contactId), queryFn: () => api.getContactReferrer(contactId), enabled: !!contactId && allowed });
};
export const useSetContactReferrer = () =>
  useApiMutation((v: { contactId: string; referrerContactId: string | null }) => api.setContactReferrer(v.contactId, v.referrerContactId), {
    invalidate: ALL,
  });

export const useReferrals = () => useQuery({ queryKey: qk.referrals, queryFn: api.listReferrals, enabled: useCanUseMenu("affiliates") });
export const useCreateReferral = () => useApiMutation((body: ReferralIn) => api.createReferral(body), { invalidate: ALL });
export const useUpdateReferral = () =>
  useApiMutation((v: { id: string; body: ReferralPatch }) => api.updateReferral(v.id, v.body), { invalidate: ALL });
/** Fetched only when the team opens it (each look is audited); never cached between opens. */
export const usePayoutDetails = (contactId: string) =>
  useQuery({ queryKey: ["affiliate-payout", contactId], queryFn: () => api.getPayoutDetails(contactId), gcTime: 0, staleTime: 0, retry: false });
export const useMarkBonusPaid = () => useApiMutation(api.markBonusPaid, { invalidate: ALL });
export const useUndoBonusPaid = () => useApiMutation(api.undoBonusPaid, { invalidate: ALL });
export const useDeleteReferral = () => useApiMutation(api.deleteReferral, { invalidate: ALL });
