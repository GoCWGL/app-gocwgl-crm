import { del, get, patch, post, put } from "./client";
import type {
  CheckoutOut,
  ClientBillingOut,
  InvoiceCreate,
  InvoiceOut,
  InvoiceUpdate,
  PaymentConnectionIn,
  PaymentConnectionOut,
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

// ------------------------------------------------------------------ Invoices (the API computes totalCents)
export const listInvoices = (filters: { status?: string; contact_id?: string } = {}) =>
  get<InvoiceOut[]>("/admin/invoices", filters);
export const getInvoice = (id: string) => get<InvoiceOut>(`/admin/invoices/${id}`);
export const createInvoice = (body: InvoiceCreate) => post<InvoiceOut>("/admin/invoices", body);
/** Drafts only. */
export const updateInvoice = (id: string, body: InvoiceUpdate) => patch<InvoiceOut>(`/admin/invoices/${id}`, body);
/** Drafts only. */
export const deleteInvoice = (id: string) => del(`/admin/invoices/${id}`);
export const sendInvoice = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/send`);
export const markInvoicePaid = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/mark-paid`);
export const voidInvoice = (id: string) => post<InvoiceOut>(`/admin/invoices/${id}/void`);

// ------------------------------------------------------------------ Payment connections (secrets come back masked)
export const listPaymentConnections = () => get<PaymentConnectionOut[]>("/admin/payment-connections");
export const savePaymentConnection = (provider: string, body: PaymentConnectionIn) =>
  put<PaymentConnectionOut>(`/admin/payment-connections/${provider}`, body);
export const deletePaymentConnection = (provider: string) => del(`/admin/payment-connections/${provider}`);

// ------------------------------------------------------------------ Client billing (portal)
export const getPortalBilling = () => get<ClientBillingOut>("/portal/billing");
/** Redirect the browser to the returned `url` (Polar checkout). */
export const checkoutInvoice = (id: string) => post<CheckoutOut>(`/portal/billing/invoices/${id}/checkout`);
