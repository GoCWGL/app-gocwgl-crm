"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/billing";
import type { InvoiceUpdate, PaymentOptionIn, SubscriptionUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useCanUseMenu } from "./useUsers";
import { useApiMutation } from "./mutation";

const BILLING_KEYS = [qk.subscriptions, qk.invoices, ["dashboard"], qk.contacts, qk.activity];

/** Pages that total things up: fetched again when opened or focused, and every minute (payments also come from others). */
const LIVE = { refetchOnMount: "always", refetchOnWindowFocus: "always", refetchInterval: 60_000 } as const;

/** Invoices page data: not requested for teammates without the Invoices menu. */
export const useSubscriptions = (contactId?: string) =>
  useQuery({ queryKey: [...qk.subscriptions, contactId ?? "all"], queryFn: () => api.listSubscriptions(contactId), enabled: useCanUseMenu("payments") });
export const useLiveSubscriptions = () =>
  useQuery({ ...LIVE, queryKey: [...qk.subscriptions, "all"], queryFn: () => api.listSubscriptions(), enabled: useCanUseMenu("payments") });
export const useCreateSubscription = () => useApiMutation(api.createSubscription, { invalidate: BILLING_KEYS });
export const useUpdateSubscription = () =>
  useApiMutation((v: { id: string; body: SubscriptionUpdate }) => api.updateSubscription(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteSubscription = () => useApiMutation(api.deleteSubscription, { invalidate: BILLING_KEYS });
export const useCancelSubscription = () => useApiMutation(api.cancelSubscription, { invalidate: BILLING_KEYS });

export const useInvoices = (filters: { status?: string; contact_id?: string } = {}) =>
  useQuery({ queryKey: [...qk.invoices, filters], queryFn: () => api.listInvoices(filters), enabled: useCanUseMenu("payments") });
export const useLiveInvoices = () =>
  useQuery({ ...LIVE, queryKey: [...qk.invoices, {}], queryFn: () => api.listInvoices({}), enabled: useCanUseMenu("payments") });
export const useCreateInvoice = () => useApiMutation(api.createInvoice, { invalidate: BILLING_KEYS });
export const useUpdateInvoice = () =>
  useApiMutation((v: { id: string; body: InvoiceUpdate }) => api.updateInvoice(v.id, v.body), { invalidate: BILLING_KEYS });
export const useDeleteInvoice = () => useApiMutation(api.deleteInvoice, { invalidate: BILLING_KEYS });
export const useSendInvoice = () => useApiMutation(api.sendInvoice, { invalidate: BILLING_KEYS });
export const useMarkInvoicePaid = () => useApiMutation(api.markInvoicePaid, { invalidate: BILLING_KEYS });
export const useVoidInvoice = () => useApiMutation(api.voidInvoice, { invalidate: BILLING_KEYS });
export const useRejectClientPaid = () => useApiMutation(api.rejectClientPaid, { invalidate: BILLING_KEYS });

// ------------------------------------------------------------------ Payment options
export const usePaymentOptions = () =>
  useQuery({ queryKey: qk.paymentOptions, queryFn: api.listPaymentOptions, enabled: useCanUseMenu("payments") });
export const useCreatePaymentOption = () => useApiMutation(api.createPaymentOption, { invalidate: [qk.paymentOptions] });
export const useUpdatePaymentOption = () =>
  useApiMutation((v: { id: string; body: PaymentOptionIn }) => api.updatePaymentOption(v.id, v.body), { invalidate: [qk.paymentOptions] });
export const useDeletePaymentOption = () => useApiMutation(api.deletePaymentOption, { invalidate: [qk.paymentOptions] });

// ------------------------------------------------------------------ Portal billing
export const usePortalBilling = () => useQuery({ queryKey: qk.portalBilling, queryFn: api.getPortalBilling });
export const useCancelMySubscription = () => useApiMutation(api.cancelMySubscription, { invalidate: [qk.portalBilling] });
export const useDownloadInvoicePdf = () => useApiMutation(api.downloadInvoicePdf);
export const useMarkMyInvoicePaid = () => useApiMutation(api.markMyInvoicePaid, { invalidate: [qk.portalBilling] });
export const useUnmarkMyInvoicePaid = () => useApiMutation(api.unmarkMyInvoicePaid, { invalidate: [qk.portalBilling] });
