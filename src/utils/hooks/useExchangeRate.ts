"use client";

import { useQuery } from "@tanstack/react-query";
import { businessCurrency, formatCentsExact } from "@/utils/format/money";
import { isSuperAdmin } from "@/utils/auth/session";
import { getSettings, setPesoRate } from "@/utils/api/settings";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";
import { useMe } from "./useUsers";

export type ExchangeRate = { rate: number; date: string };

/** Pesos taken off the daily reference rate for every $1. A rate set by a super admin is used as typed. */
const RATE_MARGIN = 1.5;

/** Saves the team's own rate (super admins; the API enforces it); null goes back to the daily rate. */
export const useSetPesoRate = () => useApiMutation(setPesoRate, { invalidate: [qk.settings] });

async function fetchRate(): Promise<ExchangeRate> {
  const res = await fetch("/exchange-rate", { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error("The exchange rate is unavailable.");
  return (await res.json()) as ExchangeRate;
}

/** US dollars to Philippine pesos, at the daily rate less RATE_MARGIN, or the rate a super admin set for the team. Amounts in another currency aren't converted. */
export function usePeso() {
  const settings = useQuery({ queryKey: qk.settings, queryFn: getSettings });
  const query = useQuery({ queryKey: qk.exchangeRate, queryFn: fetchRate, staleTime: 3_600_000, refetchInterval: 3_600_000, retry: 1 });
  const canSet = isSuperAdmin(useMe().data);
  const custom = settings.data?.usdPhpRate ?? null;
  const daily = query.data ? Math.round((query.data.rate - RATE_MARGIN) * 10_000) / 10_000 : null;
  // Nothing until the settings load, so a team rate never flashes as the daily one.
  const rate = settings.data ? (custom ?? daily) : null;
  const toCents = (cents: number, currency: string) => (rate !== null && currency.toUpperCase() === "USD" ? Math.round(cents * rate) : null);
  const text = (cents: number, currency: string) => {
    const php = toCents(cents, currency);
    return php === null ? "" : `≈ ${formatCentsExact(php, "PHP").replace("-", "−")}`;
  };
  return {
    rate,
    isCustom: custom !== null,
    /** Super admins see the rate and set the team's own. */
    canSet,
    daily: query.data ?? null,
    loading: settings.isPending || query.isPending,
    toCents,
    /** "≈ ₱1,234.00", or "" when it can't be converted. */
    text,
    /** "$20.00 (≈ ₱1,234.00)" on one line. */
    withPesos: (cents: number, currency = businessCurrency()) => {
      const php = text(cents, currency);
      return php ? `${formatCentsExact(cents, currency)} (${php})` : formatCentsExact(cents, currency);
    },
  };
}
