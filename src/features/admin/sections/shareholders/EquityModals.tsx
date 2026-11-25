"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { SHARE_CLASSES } from "@/data/shareholders";
import type { CapTableGrant, CapTableRound, EquityGrantIn, EquitySettingsOut, ShareholderOverviewOut } from "@/utils/api/models";
import { todayIso } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents } from "@/utils/format/money";
import { useSaveEquitySettings, useSaveRecord } from "@/utils/hooks/useShareholders";
import { FormModal } from "./shared";

type Done = { onClose: () => void; onSaved: (message: string) => void };

const whole = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);

export function GrantModal({ grant, data, onClose, onSaved }: Done & { grant?: CapTableGrant; data: ShareholderOverviewOut }) {
  const save = useSaveRecord("grants");
  const [stakeholderId, setStakeholder] = useState(grant?.stakeholderId ?? "");
  const [shareClass, setClass] = useState<EquityGrantIn["shareClass"]>((grant?.shareClass as EquityGrantIn["shareClass"]) ?? "common");
  const [roundId, setRound] = useState(grant?.roundId ?? "");
  const [issuedOn, setDay] = useState(grant?.issuedOn ?? data.today);
  const [shares, setShares] = useState(grant?.shares ? String(grant.shares) : "");
  const [invested, setInvested] = useState(grant?.investedCents ? centsToDollars(grant.investedCents) : "");
  const [cap, setCap] = useState(grant?.capCents ? centsToDollars(grant.capCents) : "");
  const [vest, setVest] = useState(String(grant?.vestMonths ?? 0));
  const [cliff, setCliff] = useState(String(grant?.cliffMonths ?? 0));
  const [note, setNote] = useState(grant?.note ?? "");
  const [error, setError] = useState("");
  const safe = shareClass === "safe";
  const people = data.stakeholders.filter((s) => s.status === "active" || s.id === grant?.stakeholderId);

  const submit = () => {
    const n = safe ? 0 : whole(shares);
    const vestMonths = safe ? 0 : whole(vest || "0");
    const cliffMonths = safe ? 0 : whole(cliff || "0");
    if (!stakeholderId || !issuedOn) return setError("Choose who it’s for and the date.");
    if (!safe && !(n > 0)) return setError("Enter a whole number of shares.");
    if (safe && dollarsToCents(invested) <= 0) return setError("Enter how much they invested.");
    if (!(vestMonths <= 240) || !(cliffMonths <= vestMonths)) return setError("Vesting is up to 240 months, and the cliff can’t be longer than it.");
    const body: EquityGrantIn = {
      stakeholderId,
      shareClass,
      roundId: roundId || null,
      issuedOn,
      shares: n,
      investedCents: dollarsToCents(invested),
      capCents: safe && dollarsToCents(cap) > 0 ? dollarsToCents(cap) : null,
      vestMonths,
      cliffMonths,
      note: note.trim(),
    };
    save.mutate({ id: grant?.id, body }, { onSuccess: () => onSaved("Cap table saved.") });
  };
  return (
    <FormModal
      id="gr-title"
      kicker="CAP TABLE"
      title={grant ? "Edit entry" : "Add to the cap table"}
      subtitle="Distributions already declared don’t change."
      width={620}
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Shareholder" htmlFor="gr-who" required hint={people.length ? undefined : "Add them on Shareholders first."}>
          <Select
            id="gr-who"
            placeholder="Choose…"
            value={stakeholderId}
            options={people.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(e) => setStakeholder(e.target.value)}
          />
        </Field>
        <Field label="Class" htmlFor="gr-class">
          <Select id="gr-class" value={shareClass} options={SHARE_CLASSES} onChange={(e) => setClass(e.target.value as EquityGrantIn["shareClass"])} />
        </Field>
        <Field label="Date" htmlFor="gr-day" required>
          <Input id="gr-day" type="date" value={issuedOn} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Round" htmlFor="gr-round">
          <Select
            id="gr-round"
            placeholder="None"
            value={roundId}
            options={data.capTable.rounds.map((r) => ({ value: r.roundId, label: r.name }))}
            onChange={(e) => setRound(e.target.value)}
          />
        </Field>
        {!safe && (
          <Field label={shareClass === "option" ? "Options" : "Shares"} htmlFor="gr-shares" required>
            <Input id="gr-shares" type="number" min={1} step={1} mono value={shares} onChange={(e) => setShares(e.target.value)} />
          </Field>
        )}
        <Field label="Amount invested" htmlFor="gr-inv" required={safe}>
          <Input id="gr-inv" type="number" min={0} step="0.01" mono placeholder="0.00" value={invested} onChange={(e) => setInvested(e.target.value)} />
        </Field>
        {safe ? (
          <Field label="Post-money cap" htmlFor="gr-cap" hint="Needed to estimate its shares.">
            <Input id="gr-cap" type="number" min={0} step="0.01" mono placeholder="0.00" value={cap} onChange={(e) => setCap(e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Vesting (months)" htmlFor="gr-vest" hint="0 = fully vested. 48 is common.">
              <Input id="gr-vest" type="number" min={0} max={240} step={1} mono value={vest} onChange={(e) => setVest(e.target.value)} />
            </Field>
            <Field label="Cliff (months)" htmlFor="gr-cliff" hint="Nothing vests before it. 12 is common.">
              <Input id="gr-cliff" type="number" min={0} max={240} step={1} mono value={cliff} onChange={(e) => setCliff(e.target.value)} />
            </Field>
          </>
        )}
      </div>
      <Field label="Note" htmlFor="gr-note">
        <Input id="gr-note" maxLength={200} value={note} placeholder="e.g. Certificate CS-12" onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormModal>
  );
}

export function RoundModal({ round, onClose, onSaved }: Done & { round?: CapTableRound }) {
  const save = useSaveRecord("rounds");
  const [name, setName] = useState(round?.name ?? "");
  const [closedOn, setDay] = useState(round?.closedOn ?? todayIso());
  const [pre, setPre] = useState(round?.preMoneyCents != null ? centsToDollars(round.preMoneyCents) : "");
  const [raised, setRaised] = useState(round ? centsToDollars(round.raisedCents) : "");
  const [error, setError] = useState("");
  const submit = () => {
    if (!name.trim() || !closedOn) return setError("Enter the round’s name and date.");
    const body = { name: name.trim(), closedOn, preMoneyCents: pre.trim() ? dollarsToCents(pre) : null, raisedCents: dollarsToCents(raised) };
    save.mutate({ id: round?.roundId, body }, { onSuccess: () => onSaved("Round saved.") });
  };
  return (
    <FormModal id="rd-title" kicker="FUNDING ROUNDS" title={round ? `Edit ${round.name}` : "Add a round"} mutation={save} error={error} onSubmit={submit} onClose={onClose}>
      <div className="form-grid">
        <Field label="Name" htmlFor="rd-name" required>
          <Input id="rd-name" maxLength={80} value={name} placeholder="e.g. Seed" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Closed on" htmlFor="rd-day" required>
          <Input id="rd-day" type="date" value={closedOn} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Pre-money valuation" htmlFor="rd-pre" hint="Leave empty if it wasn’t priced (SAFEs).">
          <Input id="rd-pre" type="number" min={0} step="0.01" mono value={pre} onChange={(e) => setPre(e.target.value)} />
        </Field>
        <Field label="Raised" htmlFor="rd-raised">
          <Input id="rd-raised" type="number" min={0} step="0.01" mono placeholder="0.00" value={raised} onChange={(e) => setRaised(e.target.value)} />
        </Field>
      </div>
    </FormModal>
  );
}

export function PoolModal({ settings, onClose, onSaved }: Done & { settings: EquitySettingsOut }) {
  const save = useSaveEquitySettings();
  const [total, setTotal] = useState(String(settings.totalShares));
  const [pool, setPool] = useState(String(settings.optionPool || ""));
  const [error, setError] = useState("");
  const submit = () => {
    const n = whole(pool || "0");
    const all = whole(total);
    if (!(n >= 0) || !(all > 0)) return setError("Enter whole numbers of shares.");
    save.mutate({ ...settings, optionPool: n, totalShares: all }, { onSuccess: () => onSaved("Shares saved.") });
  };
  return (
    <FormModal id="pl-title" kicker="SHARES" title="Company shares and option pool" width={440} mutation={save} error={error} onSubmit={submit} onClose={onClose}>
      <Field label="Total company shares" htmlFor="pl-total" hint="A share % is a percentage of these. Changing it keeps everyone’s shares, so their percentages change.">
        <Input id="pl-total" type="number" min={1} step={1} mono value={total} onChange={(e) => setTotal(e.target.value)} />
      </Field>
      <Field label="Option pool" htmlFor="pl-n" hint="Every share set aside for options, granted or not.">
        <Input id="pl-n" type="number" min={0} step={1} mono value={pool} onChange={(e) => setPool(e.target.value)} />
      </Field>
    </FormModal>
  );
}

export function ValuationModal({ settings, onClose, onSaved }: Done & { settings: EquitySettingsOut }) {
  const save = useSaveEquitySettings();
  const [value, setValue] = useState(settings.valuationCents != null ? centsToDollars(settings.valuationCents) : "");
  const [day, setDay] = useState(settings.valuedOn ?? todayIso());
  const [error, setError] = useState("");
  const submit = () => {
    const clear = !value.trim();
    if (!clear && !day) return setError("Enter its date.");
    save.mutate(
      { ...settings, valuationCents: clear ? null : dollarsToCents(value), valuedOn: clear ? null : day },
      { onSuccess: () => onSaved("Valuation saved.") },
    );
  };
  return (
    <FormModal
      id="vl-title"
      kicker="VALUATION"
      title="Set the valuation"
      subtitle="The newer of this and your last priced round is shown as the current valuation."
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Valuation" htmlFor="vl-n" hint="Leave empty to use rounds only.">
          <Input id="vl-n" type="number" min={0} step="0.01" mono value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="As of" htmlFor="vl-day">
          <Input id="vl-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
    </FormModal>
  );
}
