import { del, download, get, patch, post } from "./client";
import type {
  ClientBillingOut,
  InvoiceCreate,
  InvoiceOut,
  InvoiceUpdate,
  SubscriptionCreate,
  SubscriptionOut,
  SubscriptionUpdate,
} from "./models";

// ------------------------------------------------------------------ Subscriptions
export const listSubscriptions = (contactId?: string) =>
  get<SubscriptionOut[]>("/admin/subscriptions", { contact_id: contactId });
export const createSubscription = (body: SubscriptionCreate) => post<SubscriptionOut>("/admin/subscriptions", body);
export const updateSubscription = (id: string, body: SubscriptionUpdate) =>
  patch<SubscriptionOut>(`/admin/subscriptions/${id}`, body);
export const deleteSubscription = (id: string) => del(`/admin/subscriptions/${id}`);
/** Stops renewals and voids its unpaid renewal invoices; the record stays. */
export const cancelSubscription = (id: string) => post<SubscriptionOut>(`/admin/subscriptions/${id}/cancel`);

// ------------------------------------------------------------------ Invoices (the API computes totalCents)
export const listInvoices = (filters: { status?: string; contact_id?: string } = {}) =>
  get<InvoiceOut[]>("/admin/invoices", filters);
export const getInvoice = (id: string) => get<InvoiceOut>(`/admin/invoices/${id}`);
export const createInvoice = (body: InvoiceCreate) => post<InvoiceOut>("/admin/invoices", body);
/** Drafts only. */
export const updateInvoice = (id: string, body: InvoiceUpdate) => patch<InvoiceOut>(`/admin/invoices/${id}`, body);
/** Super admins only, any status. */
export const deleteInvoice = (id: string) => del(`/admin/invoices/${id}`);
export const sendInvoice = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/send`);
export const markInvoicePaid = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/mark-paid`);
export const voidInvoice = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/void`);

// ------------------------------------------------------------------ Payment connections (secrets come back masked)

// ------------------------------------------------------------------ Client billing (portal)
export const getPortalBilling = () => get<ClientBillingOut>("/portal/billing");
/** The client cancels their own invoice-billed plan (e.g. yearly hosting). */
export const cancelMySubscription = () => post<SubscriptionOut>("/portal/billing/subscription/cancel");
/** Saves the invoice as `<number>.pdf`. */
export const downloadInvoicePdf = (v: { id: string; number: string }) => download(`/portal/billing/invoices/${v.id}/pdf`, `${v.number}.pdf`);
