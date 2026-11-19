import { del, get, patch, post } from "./client";
import type {
  InvoicePreview,
  InvoicePreviewIn,
  InvoicesOverview,
  PaymentMethodIn,
  PaymentMethodOut,
  PaymentMethodUpdate,
  StaffVaInvoiceDetail,
  StaffVaInvoiceRow,
  VaHoursReport,
  VaInvoiceDetail,
  VaInvoiceIn,
  VaInvoiceUpdate,
} from "./models";

// VA portal › Invoices.
export const getInvoicesOverview = () => get<InvoicesOverview>("/va/invoices");
export const previewInvoice = (body: InvoicePreviewIn) => post<InvoicePreview>("/va/invoices/preview", body);
export const createInvoice = (body: VaInvoiceIn) => post<VaInvoiceDetail>("/va/invoices", body);
export const getInvoice = (id: string) => get<VaInvoiceDetail>(`/va/invoices/${id}`);
export const updateInvoice = (id: string, body: VaInvoiceUpdate) => patch<VaInvoiceDetail>(`/va/invoices/${id}`, body);
export const setInvoiceStatus = (id: string, status: "draft" | "sent" | "paid") => post<VaInvoiceDetail>(`/va/invoices/${id}/status`, { status });
export const deleteInvoice = (id: string) => del(`/va/invoices/${id}`);

// Payment details.
export const listPaymentMethods = () => get<PaymentMethodOut[]>("/va/payment-methods");
export const addPaymentMethod = (body: PaymentMethodIn) => post<PaymentMethodOut>("/va/payment-methods", body);
export const updatePaymentMethod = (id: string, body: PaymentMethodUpdate) => patch<PaymentMethodOut>(`/va/payment-methods/${id}`, body);
export const deletePaymentMethod = (id: string) => del(`/va/payment-methods/${id}`);

// Staff: Finance › Billing & invoices › VA invoices (every VA's sent and paid invoices to clients).
export const listStaffVaInvoices = () => get<StaffVaInvoiceRow[]>("/admin/va-invoices");
export const getStaffVaInvoice = (id: string) => get<StaffVaInvoiceDetail>(`/admin/va-invoices/${id}`);
/** Staff: Finance › Billing & invoices › VA hours: every VA's hours per client in a month ("2026-11"), and what GoCWGL invoices on the 1st. */
export const getVaHours = (month: string) => get<VaHoursReport>(`/admin/va-hours?month=${encodeURIComponent(month)}`);
