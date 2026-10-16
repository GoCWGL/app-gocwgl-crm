import type { Invoice, PaymentConnection, PaymentProvider } from "@/data/admin";

/** Sum of quantity × price for every line on an invoice. */
export const invoiceTotal = (invoice: Pick<Invoice, "items">) =>
  invoice.items.reduce((n, it) => n + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

/** The custom provider shows the name the user typed. */
export const providerName = (p: PaymentProvider, connections: Record<string, PaymentConnection>) =>
  p.id === "custom" && connections.custom?.label ? connections.custom.label : p.name;
