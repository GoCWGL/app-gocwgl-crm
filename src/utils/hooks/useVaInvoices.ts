"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/vaInvoices";
import type { InvoicePreviewIn, PaymentMethodUpdate, VaInvoiceUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Invoices change what's billed: refresh the time tracker (entries lock) and the clients' totals too. */
const KEYS = [qk.vaInvoices, qk.myTime];

export const useInvoicesOverview = (enabled = true) => useQuery({ queryKey: qk.vaInvoices, queryFn: api.getInvoicesOverview, enabled });
export const useInvoice = (id: string) => useQuery({ queryKey: [...qk.vaInvoices, "one", id], queryFn: () => api.getInvoice(id), enabled: !!id });
export const useInvoicePreview = (body: InvoicePreviewIn | null) =>
  useQuery({
    queryKey: [...qk.vaInvoices, "preview", body],
    queryFn: () => api.previewInvoice(body!),
    enabled: !!body,
    placeholderData: keepPreviousData,
  });
export const useCreateInvoice = () => useApiMutation(api.createInvoice, { invalidate: KEYS });
export const useUpdateInvoice = () =>
  useApiMutation((v: { id: string; body: VaInvoiceUpdate }) => api.updateInvoice(v.id, v.body), { invalidate: KEYS });
export const useSetInvoiceStatus = () =>
  useApiMutation((v: { id: string; status: "draft" | "sent" | "paid" }) => api.setInvoiceStatus(v.id, v.status), { invalidate: KEYS });
export const useDeleteInvoice = () => useApiMutation(api.deleteInvoice, { invalidate: KEYS });

export const usePaymentMethods = (enabled = true) => useQuery({ queryKey: qk.payMethods, queryFn: api.listPaymentMethods, enabled });
export const useAddPaymentMethod = () => useApiMutation(api.addPaymentMethod, { invalidate: [qk.payMethods] });
export const useUpdatePaymentMethod = () =>
  useApiMutation((v: { id: string; body: PaymentMethodUpdate }) => api.updatePaymentMethod(v.id, v.body), { invalidate: [qk.payMethods] });
export const useDeletePaymentMethod = () => useApiMutation(api.deletePaymentMethod, { invalidate: [qk.payMethods] });
