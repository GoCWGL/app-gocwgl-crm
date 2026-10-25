"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/affiliates";
import type { AffiliateProgramUpdate, ReferralIn, ReferralPatch } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Portal
export const useMyAffiliate = () => useQuery({ queryKey: qk.portalAffiliate, queryFn: api.getMyAffiliate });

// ------------------------------------------------------------------ Admin
/** The program's bonus shows on every referral that has no amount of its own, so both refresh together. */
const ALL = [qk.referrals, qk.affiliateProgram];

export const useAffiliateProgram = () => useQuery({ queryKey: qk.affiliateProgram, queryFn: api.getAffiliateProgram });
export const useUpdateAffiliateProgram = () => useApiMutation((body: AffiliateProgramUpdate) => api.updateAffiliateProgram(body), { invalidate: ALL });

export const useReferrals = () => useQuery({ queryKey: qk.referrals, queryFn: api.listReferrals });
export const useCreateReferral = () => useApiMutation((body: ReferralIn) => api.createReferral(body), { invalidate: ALL });
export const useUpdateReferral = () =>
  useApiMutation((v: { id: string; body: ReferralPatch }) => api.updateReferral(v.id, v.body), { invalidate: ALL });
export const useMarkBonusPaid = () => useApiMutation(api.markBonusPaid, { invalidate: ALL });
export const useUndoBonusPaid = () => useApiMutation(api.undoBonusPaid, { invalidate: ALL });
export const useDeleteReferral = () => useApiMutation(api.deleteReferral, { invalidate: ALL });
