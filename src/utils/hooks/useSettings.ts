"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import * as api from "@/utils/api/settings";
import { setBusinessTimeZone } from "@/utils/format/dates";
import { setDefaultCurrency } from "@/utils/format/money";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Business settings; also sets the currency and time zone every admin screen formats with. */
export function useSettings(enabled = true) {
  const query = useQuery({ queryKey: qk.settings, queryFn: api.getSettings, enabled });
  useEffect(() => {
    if (!query.data) return;
    setDefaultCurrency(query.data.currency);
    setBusinessTimeZone(query.data.timezone);
  }, [query.data]);
  return query;
}

export const useUpdateSettings = () => useApiMutation(api.updateSettings, { invalidate: [qk.settings, qk.calendars] });
export const useSetSubdomain = () => useApiMutation(api.setSubdomain, { invalidate: [qk.settings] });

export const useDomains = () => useQuery({ queryKey: qk.domains, queryFn: api.listDomains });
export const useAddDomain = () => useApiMutation(api.addDomain, { invalidate: [qk.domains] });
export const useSetDomainPurpose = () =>
  useApiMutation((v: { id: string; purpose: Parameters<typeof api.setDomainPurpose>[1] }) => api.setDomainPurpose(v.id, v.purpose), {
    invalidate: [qk.domains],
  });
export const useVerifyDomain = () => useApiMutation(api.verifyDomain, { invalidate: [qk.domains] });
export const useMakeDomainPrimary = () => useApiMutation(api.makeDomainPrimary, { invalidate: [qk.domains] });
export const useDeleteDomain = () => useApiMutation(api.deleteDomain, { invalidate: [qk.domains] });
