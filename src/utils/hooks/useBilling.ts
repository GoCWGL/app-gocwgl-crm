"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/billing";
import type { InvoiceUpdate, SubscriptionUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useCanUseMenu } from "./useUsers";
import { useApiMutation } from "./mutation";

const BILLING_KEYS = [qk.subscriptions, qk.invoices, ["dashboard"], qk.contacts, qk.activity];

/** Transactions data: not requested for teammates without the Transactions menu. */
export const useSubscriptions = (contactId?: string) =>
  useQuery({ queryKey: [...qk.subscriptions, contactId ?? "all"], queryFn: () => api.listSubscriptions(contactId), enabled: useCanUseMenu("payments") });
export const useCreateSubscription = () => useApiMutation(api.createSubscription, { invalidate: BILLING_KEYS });
export const useUpdateSubscription = () =>
  useApiMutation((v: { id: string; body: SubscriptionUpdate }) => api.updateSubscription(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteSubscription = () => useApiMutation(api.deleteSubscription, { invalidate: BILLING_KEYS });
export const useCancelSubscription = () => useApiMutation(api.cancelSubscription, { invalidate: BILLING_KEYS });

export const useInvoices = (filters: { status?: string; contact_id?: string } = {}) =>
  useQuery({ queryKey: [...qk.invoices, filters], queryFn: () => api.listInvoices(filters), enabled: useCanUseMenu("payments") });
export const useCreateInvoice = () => useApiMutation(api.createInvoice, { invalidate: BILLING_KEYS });
export const useUpdateInvoice = () =>
  useApiMutation((v: { id: string; body: InvoiceUpdate }) => api.updateInvoice(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteInvoice = () => useApiMutation(api.deleteInvoice, { invalidate: BILLING_KEYS });
export const useSendInvoice = () => useApiMutation(api.sendInvoice, { invalidate: BILLING_KEYS });
export const useMarkInvoicePaid = () => useApiMutation(api.markInvoicePaid, { invalidate: BILLING_KEYS });
export const useVoidInvoice = () => useApiMutation(api.voidInvoice, { invalidate: BILLING_KEYS });


// ------------------------------------------------------------------ Portal billing
export const usePortalBilling = () => useQuery({ queryKey: qk.portalBilling, queryFn: api.getPortalBilling });
export const useCancelMySubscription = () => useApiMutation(api.cancelMySubscription, { invalidate: [qk.portalBilling] });
export const useDownloadInvoicePdf = () => useApiMutation(api.downloadInvoicePdf);
