/**
 * Money from the API is always integer cents. Admin screens pass the business currency
 * (from /admin/settings); invoices and subscriptions carry their own `currency`.
 */
let defaultCurrency = "USD";

/** Set once the business settings load, so every amount uses the business currency. */
export function setDefaultCurrency(currency: string | null | undefined) {
  if (currency) defaultCurrency = currency.toUpperCase();
}

/** 9700 → "$97" · 9750 → "$97.50" (whole amounts drop the ".00", like the original design). */
export function formatCents(cents: number | null | undefined, currency: string = defaultCurrency): string {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

/** 9700 → "$97.00" (always two decimals; for invoices and line items). */
export function formatCentsExact(cents: number | null | undefined, currency: string = defaultCurrency): string {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/** "$97/mo" from cents and an interval ("Month" | "Year" | …). */
export function formatPerInterval(cents: number, interval = "Month", currency?: string): string {
  const unit = /year/i.test(interval) ? "yr" : /week/i.test(interval) ? "wk" : "mo";
  return `${formatCents(cents, currency)}/${unit}`;
}

/** What a user typed in a dollars field ("97", "97.5", "$1,200") → cents. */
export function dollarsToCents(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Cents → plain dollars text for an input field ("97", "97.5"). */
export function centsToDollars(cents: number | null | undefined): string {
  const value = (Number(cents) || 0) / 100;
  return String(Math.round(value * 100) / 100);
}
