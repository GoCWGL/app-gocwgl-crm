"use client";

import { useState, type FormEvent } from "react";
import { Button, FormError, Input } from "@/components/ui";
import { formatLong } from "@/utils/format/dates";
import { businessCurrency, formatCentsExact } from "@/utils/format/money";
import { usePeso, useSetPesoRate } from "@/utils/hooks/useExchangeRate";

/** An amount, with what it is in pesos under it. `text` replaces how the amount itself is written ("−$1,200", "$97/mo"). */
export function Amount({ cents, currency = businessCurrency(), text }: { cents: number; currency?: string; text?: string }) {
  const peso = usePeso().text(cents, currency);
  return (
    <span className="peso-amount">
      <span>{text ?? formatCentsExact(cents, currency)}</span>
      {peso && <span className="peso-amount__php">{peso}</span>}
    </span>
  );
}

/** A headline card's amount in pesos, beside it. */
export function HeroPeso({ cents, currency = businessCurrency() }: { cents: number; currency?: string }) {
  const peso = usePeso().text(cents, currency);
  return peso ? <span className="ov-hero__peso">{peso}</span> : null;
}

/** The rate in use, and a way to set one for the whole team. Super admins only, when the business uses US dollars. */
export function PesoRateBar({ currency }: { currency: string }) {
  const { rate, isCustom, canSet, daily, loading } = usePeso();
  const setRate = useSetPesoRate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  if (!canSet || currency.toUpperCase() !== "USD") return null;
  const close = () => {
    setEditing(false);
    setError("");
    setRate.reset();
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (!(n >= 1 && n <= 1000)) return setError("Enter pesos per dollar, from 1 to 1,000.");
    setError("");
    setRate.mutate(n, { onSuccess: close });
  };
  return (
    <div className="peso-rate" role="group" aria-label="US dollar to peso rate">
      <span className="peso-rate__symbol" aria-hidden="true">
        ₱
      </span>
      <span className="peso-rate__main">
        <b>{rate !== null ? `$1 = ₱${rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : loading ? "Getting the peso rate…" : "Peso rate unavailable"}</b>
        <span className="text-small">
          {isCustom
            ? "Set for the whole team."
            : daily
              ? `As of ${formatLong(daily.date)}`
              : loading
                ? ""
                : "Set a rate to see pesos."}
        </span>
      </span>
      {editing ? (
        <form className="cluster" onSubmit={save}>
          <Input
            size="sm"
            className="input--auto peso-rate__input"
            type="number"
            min={1}
            max={1000}
            step="0.0001"
            mono
            autoFocus
            aria-label="Pesos per US dollar"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button size="sm" type="submit" variant="primary" disabled={setRate.isPending}>
            {setRate.isPending ? "Saving…" : "Use rate"}
          </Button>
          <Button size="sm" onClick={close}>
            Cancel
          </Button>
          {error && (
            <span className="text-error" role="alert">
              {error}
            </span>
          )}
        </form>
      ) : (
        <span className="cluster">
          {isCustom && (
            <Button size="sm" disabled={setRate.isPending} onClick={() => setRate.mutate(null)}>
              Use daily rate
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setValue(rate ? String(rate) : "");
              setEditing(true);
            }}
          >
            {isCustom ? "Change rate" : "Set rate"}
          </Button>
        </span>
      )}
      <FormError error={setRate.error} />
    </div>
  );
}
