"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/billing";
import type { InvoiceUpdate, SubscriptionUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

const BILLING_KEYS = [qk.subscriptions, qk.invoices, ["dashboard"], qk.contacts, qk.activity];

export const useSubscriptions = (contactId?: string) =>
  useQuery({ queryKey: [...qk.subscriptions, contactId ?? "all"], queryFn: () => api.listSubscriptions(contactId) });
export const useCreateSubscription = () => useApiMutation(api.createSubscription, { invalidate: BILLING_KEYS });
export const useUpdateSubscription = () =>
  useApiMutation((v: { id: string; body: SubscriptionUpdate }) => api.updateSubscription(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteSubscription = () => useApiMutation(api.deleteSubscription, { invalidate: BILLING_KEYS });

export const useInvoices = (filters: { status?: string; contact_id?: string } = {}) =>
  useQuery({ queryKey: [...qk.invoices, filters], queryFn: () => api.listInvoices(filters) });
export const useCreateInvoice = () => useApiMutation(api.createInvoice, { invalidate: BILLING_KEYS });
export const useUpdateInvoice = () =>
  useApiMutation((v: { id: string; body: InvoiceUpdate }) => api.updateInvoice(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteInvoice = () => useApiMutation(api.deleteInvoice, { invalidate: BILLING_KEYS });
export const useSendInvoice = () => useApiMutation(api.sendInvoice, { invalidate: BILLING_KEYS });
export const useMarkInvoicePaid = () => useApiMutation(api.markInvoicePaid, { invalidate: BILLING_KEYS });
export const useVoidInvoice = () => useApiMutation(api.voidInvoice, { invalidate: BILLING_KEYS });


// ------------------------------------------------------------------ Portal billing
export const usePortalBilling = () => useQuery({ queryKey: qk.portalBilling, queryFn: api.getPortalBilling });
/** Polar checkout: the browser leaves for the returned URL. */
const redirect = (r: { url: string }) => window.location.assign(r.url);
export const useCheckoutInvoice = () => useApiMutation(api.checkoutInvoice, { onSuccess: redirect });
