"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { Button, Checkbox, Field, FormError, Icon, Input, Modal, Select, StatGrid, Textarea } from "@/components/ui";
import { count, DISTRIBUTION_KINDS, distributionLabel, sharePct } from "@/data/shareholders";
import { cn } from "@/lib/utils";
import type { DistributionDetailOut, DistributionIn, DistributionOut, DistributionPreviewOut, DistributionsOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { useDeclareDistribution, usePreviewDistribution, useSaveDistribution, useSetResolution, useShareholders } from "@/utils/hooks/useShareholders";

const STEPS = ["Details", "Breakdown & tax", "Confirm & publish"];
const MAX_CENTS = 100_000_000_000;

/** Declare a distribution in three steps: what it is, who gets what after tax, then publish (or keep a draft). */
export function DistributionWizard({
  data,
  draft,
  onClose,
  onDone,
}: {
  data: DistributionsOut;
  draft?: DistributionOut;
  onClose: () => void;
  onDone: (run: DistributionDetailOut, message: string) => void;
}) {
  const preview = usePreviewDistribution();
  const save = useSaveDistribution();
  const declare = useDeclareDistribution();
  const resolution = useSetResolution();
  const [step, setStep] = useState(0);
  // Set once saved, so trying again updates the same draft instead of adding another.
  const [id, setId] = useState(draft?.id);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [kind, setKind] = useState<DistributionIn["kind"]>((draft?.kind as DistributionIn["kind"]) ?? "cash_dividend");
  const [pool, setPool] = useState(draft ? centsToDollars(draft.poolCents) : "");
  const [recordDate, setRecord] = useState(draft?.recordDate ?? data.today);
  const [paymentDate, setPayment] = useState(draft?.paymentDate ?? data.today);
  // A class that's since disappeared from the cap table isn't offered, so it isn't kept either.
  const [classes, setClasses] = useState<string[]>(() => {
    const keys = data.classes.map((c) => c.key);
    return draft ? draft.classes.filter((c) => keys.includes(c)) : keys;
  });
  const [note, setNote] = useState(draft?.note ?? "");
  const [rates, setRates] = useState<Record<string, number>>(draft?.taxOverrides ?? {});
  const [file, setFile] = useState<File | null>(null);
  const [notify, setNotify] = useState(true);
  const [sure, setSure] = useState(false);
  const [error, setError] = useState("");
  const busy = preview.isPending || save.isPending || declare.isPending || resolution.isPending;
  const cents = dollarsToCents(pool);
  const p = preview.data;

  const body = (taxOverrides = rates): DistributionIn => ({ title: title.trim(), kind, poolCents: cents, recordDate, paymentDate, classes, taxOverrides, note: note.trim() });

  const check = (): string => {
    if (!title.trim()) return "Give it a title.";
    if (!(cents > 0) || cents > MAX_CENTS) return "Enter a total pool up to 1,000,000,000.";
    if (!recordDate || !paymentDate) return "Choose the record and payment dates.";
    if (paymentDate < recordDate) return "The payment date can’t be before the record date.";
    if (!classes.length) return "Choose at least one share class.";
    return "";
  };
  const clearErrors = () => {
    setError("");
    save.reset();
    declare.reset();
    resolution.reset();
  };
  const refresh = (overrides = rates) => preview.mutateAsync(body(overrides));

  const next = async () => {
    clearErrors();
    if (step === 0) {
      const problem = check();
      if (problem) return setError(problem);
      try {
        await refresh();
        setStep(1);
      } catch {
        // Shown below the form.
      }
    } else if (step === 1) {
      setSure(false);
      setStep(2);
    }
  };

  const setRate = (stakeholderId: string, bps: number, fallback: number) => {
    const rest = { ...rates };
    delete rest[stakeholderId];
    const after = bps === fallback ? rest : { ...rest, [stakeholderId]: bps };
    setRates(after);
    preview.mutate(body(after));
  };

  const saveDraft = async (): Promise<DistributionDetailOut> => {
    const run = await save.mutateAsync({ id, body: body() });
    setId(run.id);
    if (!file) return run;
    const withFile = await resolution.mutateAsync({ id: run.id, file });
    setFile(null);
    return withFile;
  };
  const onSaveDraft = async () => {
    clearErrors();
    const problem = check();
    if (problem) return setError(problem);
    try {
      onDone(await saveDraft(), "Draft saved. Nobody has been told.");
    } catch {
      // Shown below the form.
    }
  };
  const onDeclare = async () => {
    clearErrors();
    if (!p) return;
    if (!sure) return setError("Confirm that it’s approved and the breakdown is right.");
    try {
      const run = await saveDraft();
      const done = await declare.mutateAsync({ id: run.id, fingerprint: p.fingerprint, notify });
      onDone(done, notify ? "Declared. Emails are on their way." : "Declared. It’s on each shareholder’s dashboard.");
    } catch {
      // Shown below the form; step 2 re-checks the breakdown.
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (step < 2) void next();
    else void onDeclare();
  };
  const reachable = p?.rows.filter((r) => r.email).length ?? 0;

  return (
    <Modal
      open
      width={step === 1 ? 1080 : 760}
      onClose={() => !busy && onClose()}
      onSubmit={submit}
      titleId="dw-title"
      kicker="DECLARE DISTRIBUTION"
      title={STEPS[step]}
      subtitle={title.trim() || undefined}
      footer={
        <>
          {step > 0 ? (
            <Button onClick={() => (clearErrors(), setStep(step - 1))} disabled={busy}>
              Back
            </Button>
          ) : (
            <Button onClick={onClose}>Cancel</Button>
          )}
          <span className="u-spacer" />
          <Button variant="outline" onClick={() => void onSaveDraft()} disabled={busy}>
            {save.isPending && !declare.isPending ? "Saving…" : "Save as Draft"}
          </Button>
          {step < 2 ? (
            <Button type="submit" variant="primary" disabled={busy || (step === 1 && !p?.rows.length)}>
              {preview.isPending ? "Calculating…" : "Next"}
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={busy || !p?.final}>
              {declare.isPending ? "Declaring…" : notify ? "Declare & Notify Shareholders" : "Declare"}
            </Button>
          )}
        </>
      }
    >
      <ol className="dw-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("dw-steps__item", i === step && "is-current", i < step && "is-done")} aria-current={i === step ? "step" : undefined}>
            <span className="dw-steps__dot">{i < step ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <Field label="Distribution title" htmlFor="dw-name" required>
            <Input id="dw-name" maxLength={160} value={title} placeholder="e.g. FY 2026 Annual Cash Dividend" onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="form-grid">
            <Field label="Distribution type" htmlFor="dw-kind" hint={DISTRIBUTION_KINDS.find((k) => k.value === kind)?.hint}>
              <Select id="dw-kind" value={kind} options={DISTRIBUTION_KINDS} onChange={(e) => setKind(e.target.value as DistributionIn["kind"])} />
            </Field>
            <Field
              label={`Total distribution pool (${data.currency})`}
              htmlFor="dw-pool"
              required
              hint={kind === "cash_dividend" ? `Net income available: ${formatCents(data.retainedCents, data.currency)}` : "Before tax."}
            >
              <Input id="dw-pool" type="number" min={0} step="0.01" mono placeholder="0.00" value={pool} onChange={(e) => setPool(e.target.value)} />
            </Field>
            <Field label="Record date" htmlFor="dw-record" required hint="Whoever held shares at the end of this day qualifies.">
              <Input id="dw-record" type="date" value={recordDate} onChange={(e) => setRecord(e.target.value)} />
            </Field>
            <Field label="Payment date" htmlFor="dw-pay" required hint="When you plan to pay.">
              <Input id="dw-pay" type="date" min={recordDate} value={paymentDate} onChange={(e) => setPayment(e.target.value)} />
            </Field>
          </div>
          {kind === "cash_dividend" && data.retainedCents > 0 && (
            <div className="cluster">
              <span className="text-small">Pay out of net income:</span>
              {[25, 50, 75, 100].map((pct) => (
                <Button key={pct} size="sm" variant="outline" onClick={() => setPool(centsToDollars(Math.floor((data.retainedCents * pct) / 100)))}>
                  {pct}%
                </Button>
              ))}
            </div>
          )}
          <Field label="Eligible share classes" hint="Unexercised options and unconverted SAFEs never qualify.">
            <div className="cluster">
              {data.classes.map((c) => (
                <Checkbox
                  key={c.key}
                  label={`${c.label} (${count(c.shares)})`}
                  checked={classes.includes(c.key)}
                  onChange={(e) => setClasses((x) => (e.target.checked ? [...x, c.key] : x.filter((k) => k !== c.key)))}
                />
              ))}
            </div>
          </Field>
          <Field label="Note to shareholders" htmlFor="dw-note">
            <Textarea id="dw-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {kind === "cash_dividend" && cents > data.retainedCents && (
            <div className="notice" role="status">
              This is more than the net income available. Dividends normally come only from unrestricted retained earnings, so check with your accountant first.
            </div>
          )}
        </>
      )}

      {step === 1 && p && <Breakdown p={p} currency={data.currency} rates={rates} busy={preview.isPending} onRate={setRate} />}

      {step === 2 && p && (
        <>
          <dl className="sh-facts">
            {[
              ["Type", distributionLabel(kind)],
              ["Record date", formatLong(recordDate)],
              ["Payment date", formatLong(paymentDate)],
              ["Shareholders", String(p.rows.length)],
              ["Gross pool", formatCentsExact(p.grossCents, data.currency)],
              ["Tax withheld", formatCentsExact(p.taxCents, data.currency)],
              ["Net to pay", formatCentsExact(p.netCents, data.currency)],
              ["Eligible classes", data.classes.filter((c) => classes.includes(c.key)).map((c) => c.label).join(", ")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <ResolutionDrop file={file} saved={draft?.resolutionName ?? ""} onFile={setFile} onError={setError} />
          {!p.final && (
            <div className="notice" role="status">
              The record date is still to come, so shares may change. Save it as a draft and declare it from {formatLong(recordDate)}.
            </div>
          )}
          <Checkbox
            label={`Email shareholders their payout (${reachable} of ${p.rows.length} have an email)`}
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          <Checkbox label="This distribution is approved and the breakdown is right. It can’t be edited once declared." checked={sure} onChange={(e) => setSure(e.target.checked)} />
          <span className="text-small">Declaring adds each payout to the shareholder’s dashboard. It doesn’t move money: you pay them, then mark each one paid.</span>
        </>
      )}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      <FormError error={preview.error ?? save.error ?? resolution.error ?? declare.error} />
      {declare.error != null && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            declare.reset();
            void refresh().then(
              () => setStep(1),
              () => undefined,
            );
          }}
        >
          Recalculate the breakdown
        </Button>
      )}
    </Modal>
  );
}

function Breakdown({
  p,
  currency,
  rates,
  busy,
  onRate,
}: {
  p: DistributionPreviewOut;
  currency: string;
  rates: Record<string, number>;
  busy: boolean;
  onRate: (stakeholderId: string, bps: number, fallback: number) => void;
}) {
  const money = (cents: number) => formatCentsExact(cents, currency);
  // Shares nobody holds get nothing, so the holders split the whole pool.
  const cap = useShareholders().data?.capTable;
  const unassigned = cap ? cap.companyShares - cap.issued : 0;
  return (
    <>
      <StatGrid
        items={[
          { label: "Gross pool", value: money(p.grossCents), tone: "cyan", glyph: "$" },
          { label: "Tax withheld", value: money(p.taxCents), tone: "amber", glyph: "$" },
          { label: "Net to pay", value: money(p.netCents), tone: "green", glyph: "$" },
          { label: "Shareholders", value: p.rows.length, tone: "purple", glyph: "#" },
        ]}
      />
      {cap && unassigned > 0 && p.rows.length > 0 && (
        <div className="notice" role="status">
          {sharePct(unassigned, cap.companyShares)} of the company isn’t assigned to anyone, and unassigned shares get nothing. The whole pool is split between the shareholders
          below, so each gets more than their share % of it.
        </div>
      )}
      {!p.final && (
        <div className="notice" role="status">
          The record date is still to come, so this is provisional.
        </div>
      )}
      {p.rows.length ? (
        <div className="table-scroll">
          <table className="data-table data-table--plain">
            <thead>
              <tr>
                <th>Shareholder</th>
                <th>Shares</th>
                <th>Share of pool</th>
                <th>Gross</th>
                <th>Tax %</th>
                <th>Tax withheld</th>
                <th>Net payout</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r) => (
                <tr key={r.stakeholderId}>
                  <td>
                    <div className="stack stack--4">
                      <span className="u-strong u-ink">{r.name}</span>
                      {r.issues.length > 0 && (
                        <span className="text-small">Not on record (optional): {r.issues.join(", ")}</span>
                      )}
                      {!r.payoutTo && <span className="text-small">No payout account saved</span>}
                    </div>
                  </td>
                  <td className="data-table__mono">{count(r.shares)}</td>
                  <td className="data-table__mono">{sharePct(r.shares, r.totalShares)}</td>
                  <td className="data-table__mono">{money(r.grossCents)}</td>
                  <td>
                    <RateInput key={r.taxBps} name={r.name} bps={r.taxBps} disabled={busy} onSet={(bps) => onRate(r.stakeholderId, bps, r.defaultTaxBps)} />
                    <span className="text-small">{r.stakeholderId in rates ? ` default ${r.defaultTaxBps / 100}%` : " auto"}</span>
                  </td>
                  <td className="data-table__mono">{money(r.taxCents)}</td>
                  <td className="data-table__mono u-strong">{money(r.netCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Nobody held eligible shares on the record date. Go back and check the date and share classes.</div>
      )}
      <span className="text-small">
        Gross = pool × eligible shares ÷ all eligible shares. Net = gross − tax withheld. Rates come from each shareholder’s tax type and can be changed here; they’re a starting
        point, so confirm them with your accountant.
      </span>
    </>
  );
}

/** Saves when you leave the field or press Enter. */
function RateInput({ name, bps, disabled, onSet }: { name: string; bps: number; disabled: boolean; onSet: (bps: number) => void }) {
  const [value, setValue] = useState(String(bps / 100));
  const commit = () => {
    const n = Math.round(Number(value) * 100);
    if (value.trim() === "" || !(n >= 0 && n <= 10_000)) return setValue(String(bps / 100));
    if (n !== bps) onSet(n);
  };
  return (
    <Input
      size="sm"
      className="input--auto dw-rate"
      type="number"
      min={0}
      max={100}
      step="0.01"
      mono
      aria-label={`Tax % for ${name}`}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

function ResolutionDrop({ file, saved, onFile, onError }: { file: File | null; saved: string; onFile: (f: File | null) => void; onError: (message: string) => void }) {
  const [over, setOver] = useState(false);
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name)) return onError("Upload the resolution as a PDF.");
    onError("");
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files[0]);
  };
  return (
    <Field label="Board resolution (optional)" hint="The signed PDF approving it. Only super admins can open it.">
      <label
        className={cn("dw-drop", over && "is-over")}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <Icon name="upload" size={18} />
        <span>{file?.name || saved || "Drop the PDF here, or click to choose it"}</span>
        <input className="sr-only" id="dw-file" type="file" accept="application/pdf,.pdf" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
    </Field>
  );
}
