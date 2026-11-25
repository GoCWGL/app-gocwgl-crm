"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, ConfirmDialog, Field, FormError, Input, LoadState, ProgressBar, StatGrid, Textarea } from "@/components/ui";
import { bpsPct, count, distributionLabel, sharePct } from "@/data/shareholders";
import { downloadCsv } from "@/lib/csv";
import type { DistributionDetailOut, DistributionOut, DistributionPayoutOut, DistributionsOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { usePeso } from "@/utils/hooks/useExchangeRate";
import {
  useCancelDistribution,
  useDistribution,
  useDistributions,
  useDownloadVoucher,
  useMarkPayoutPaid,
  useOpenReceipt,
  useOpenResolution,
  useSetPayoutTax,
  useUndoPayoutPaid,
} from "@/utils/hooks/useShareholders";
import { Amount, PesoRateBar } from "../../components/Peso";
import { useAdmin } from "../../state/AdminContext";
import { DistributionWizard } from "./DistributionWizard";
import { FormModal, RowActions, SectionCard, SimpleTable } from "./shared";

/** Shareholders › Declare Distribution: the wizard, every run, and each run's payouts. */
export function DistributionsSection() {
  const query = useDistributions();
  const { notify } = useAdmin();
  const [openId, setOpenId] = useState("");
  const [wizard, setWizard] = useState<DistributionOut | "new" | null>(null);
  const d = query.data;
  return (
    <LoadState query={query} loadingText="Loading distributions…">
      {d && (
        <>
          {openId ? <Run id={openId} data={d} onBack={() => setOpenId("")} /> : <Runs data={d} onOpen={setOpenId} onDeclare={setWizard} />}
          {wizard && (
            <DistributionWizard
              data={d}
              draft={wizard === "new" ? undefined : wizard}
              onClose={() => setWizard(null)}
              onDone={(run, message) => {
                setWizard(null);
                if (run.status !== "draft") setOpenId(run.id);
                notify(message);
              }}
            />
          )}
        </>
      )}
    </LoadState>
  );
}

function StatusBadge({ run }: { run: DistributionOut }) {
  const tone = { draft: "neutral", processing: "amber", completed: "green", canceled: "red" } as const;
  const label = { draft: "Draft", processing: "Processing", completed: "Completed", canceled: "Canceled" };
  const s = run.status as keyof typeof tone;
  return (
    <span className="cluster">
      <Badge tone={tone[s]}>{label[s]}</Badge>
      {run.overdue && <Badge tone="red">Past payment date</Badge>}
    </span>
  );
}

function Runs({ data, onOpen, onDeclare }: { data: DistributionsOut; onOpen: (id: string) => void; onDeclare: (d: DistributionOut | "new") => void }) {
  const live = data.runs.filter((r) => r.status === "processing" || r.status === "completed");
  const sum = (f: (r: DistributionOut) => number) => live.reduce((t, r) => t + f(r), 0);
  const hasShares = data.classes.some((c) => c.shares > 0);
  return (
    <div className="stack stack--16">
      <PesoRateBar currency={data.currency} />
      <StatGrid
        items={[
          { label: "Declared", value: <Amount cents={sum((r) => r.poolCents)} currency={data.currency} />, tone: "cyan", glyph: "$" },
          { label: "Tax withheld", value: <Amount cents={sum((r) => r.taxCents)} currency={data.currency} />, tone: "purple", glyph: "$" },
          { label: "Net paid", value: <Amount cents={sum((r) => r.netPaidCents)} currency={data.currency} />, tone: "green", glyph: "$" },
          { label: "Net still to pay", value: <Amount cents={sum((r) => r.netCents - r.netPaidCents)} currency={data.currency} />, tone: "amber", glyph: "$" },
        ]}
      />
      <SectionCard
        kicker={`DISTRIBUTION RUNS · ${data.runs.length}`}
        action={
          <Button variant="primary" aria-haspopup="dialog" disabled={!hasShares} title={hasShares ? undefined : "Give someone shares first"} onClick={() => onDeclare("new")}>
            + Declare Distribution
          </Button>
        }
        note={hasShares ? undefined : "Nobody holds shares yet. Add shareholders with a share % first."}
      >
        <SimpleTable
          head={["Title", "Record date", "Payment date", "Gross pool", "Tax withheld", "Net paid", "Progress", "Status", "Actions"]}
          empty="No distributions yet. Declare one to pay a dividend, return capital or share exit proceeds."
        >
          {data.runs.map((r) => {
            const draft = r.status === "draft";
            return (
              <tr key={r.id}>
                <td>
                  <div className="stack stack--2">
                    <span className="u-strong u-ink">{r.title}</span>
                    <span className="text-small">{distributionLabel(r.kind)}</span>
                  </div>
                </td>
                <td>{formatLong(r.recordDate)}</td>
                <td>{formatLong(r.paymentDate)}</td>
                <td className="data-table__mono">
                  <Amount cents={r.poolCents} currency={r.currency} />
                </td>
                <td className="data-table__mono">{draft ? "—" : <Amount cents={r.taxCents} currency={r.currency} />}</td>
                <td className="data-table__mono">{draft ? "—" : <Amount cents={r.netPaidCents} currency={r.currency} />}</td>
                <td>
                  {draft ? (
                    "—"
                  ) : (
                    <div className="stack stack--4">
                      <span className="text-small">
                        {r.paid} / {r.count} Paid
                      </span>
                      <ProgressBar size="sm" tone="green" value={r.count ? (r.paid / r.count) * 100 : 0} label={`${r.title} progress`} />
                    </div>
                  )}
                </td>
                <td>
                  <StatusBadge run={r} />
                </td>
                <td className="data-table__actions">
                  {draft ? (
                    <RowActions kind="distributions" id={r.id} name={r.title} onEdit={() => onDeclare(r)} />
                  ) : (
                    <>
                      <button type="button" className="row-action row-action--brand" aria-label={`Open ${r.title}`} onClick={() => onOpen(r.id)}>
                        Open
                      </button>
                      {r.status === "canceled" && <RowActions kind="distributions" id={r.id} name={r.title} />}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </SimpleTable>
      </SectionCard>
    </div>
  );
}

function Run({ id, data, onBack }: { id: string; data: DistributionsOut; onBack: () => void }) {
  const query = useDistribution(id);
  const { notify } = useAdmin();
  const openResolution = useOpenResolution();
  const [canceling, setCanceling] = useState(false);
  const peso = usePeso();
  const run = query.data;
  const labels = run?.classes.map((c) => data.classes.find((x) => x.key === c)?.label ?? "Removed class").join(", ");
  const inPesos = !!run && peso.toCents(0, run.currency) !== null;
  const exportCsv = () =>
    run &&
    downloadCsv(
      `${run.title.replace(/[^\w-]+/g, "-").toLowerCase()}-payouts.csv`,
      [
        "Shareholder",
        "Eligible shares",
        "Ownership %",
        `Gross (${run.currency})`,
        "Tax %",
        "Tax withheld",
        "Net payable",
        ...(inPesos ? [`Net in PHP (at ${peso.rate})`] : []),
        "Paid to",
        "Status",
        "Paid on",
        "Reference",
        "Not on record",
      ],
      run.payouts.map((p) => [
        p.name,
        p.shares,
        sharePct(p.shares, p.totalShares),
        (p.grossCents / 100).toFixed(2),
        p.taxBps / 100,
        (p.taxCents / 100).toFixed(2),
        (p.netCents / 100).toFixed(2),
        ...(inPesos ? [((peso.toCents(p.netCents, run.currency) ?? 0) / 100).toFixed(2)] : []),
        p.payoutTo,
        p.status,
        p.paidOn ?? "",
        p.reference,
        p.issues.join("; "),
      ]),
    );
  return (
    <div className="stack stack--16">
      <div className="cluster cluster--between">
        <Button onClick={onBack}>← All distributions</Button>
        {run && (
          <span className="cluster">
            {run.resolutionName && (
              <Button variant="outline" disabled={openResolution.isPending} onClick={() => openResolution.mutate(run.id)}>
                Board resolution
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
            {run.status === "canceled" && <RowActions kind="distributions" id={run.id} name={run.title} onDeleted={onBack} />}
            {run.status === "processing" && run.paid === 0 && (
              <Button variant="danger" onClick={() => setCanceling(true)}>
                Cancel distribution
              </Button>
            )}
          </span>
        )}
      </div>
      <FormError error={openResolution.error} />
      <LoadState query={query} loadingText="Loading payouts…">
        {run && (
          <>
            <PesoRateBar currency={run.currency} />
            <StatGrid
              items={[
                { label: "Gross pool", value: <Amount cents={run.poolCents} currency={run.currency} />, tone: "cyan", glyph: "$" },
                { label: "Tax withheld", value: <Amount cents={run.taxCents} currency={run.currency} />, tone: "purple", glyph: "$" },
                { label: "Net paid", value: <Amount cents={run.netPaidCents} currency={run.currency} />, tone: "green", glyph: "$" },
                { label: "Paid", value: `${run.paid} / ${run.count}`, tone: "amber", glyph: "#" },
              ]}
            />
            <SectionCard
              kicker={run.title.toUpperCase()}
              action={<StatusBadge run={run} />}
              note={`${distributionLabel(run.kind)} · record date ${formatLong(run.recordDate)} · payment date ${formatLong(run.paymentDate)} · ${labels} · declared ${formatLong(run.declaredAt)}`}
            >
              {run.status === "canceled" && (
                <div className="notice" role="status">
                  Canceled {formatLong(run.canceledAt)}: {run.cancelReason}
                </div>
              )}
              <Payouts run={run} today={data.today} />
            </SectionCard>
          </>
        )}
      </LoadState>
      {canceling && run && (
        <CancelModal
          run={run}
          onClose={() => setCanceling(false)}
          onDone={() => {
            setCanceling(false);
            notify("Distribution canceled. It’s off shareholders’ dashboards; nobody was emailed.");
          }}
        />
      )}
    </div>
  );
}

function Payouts({ run, today }: { run: DistributionDetailOut; today: string }) {
  const { notify } = useAdmin();
  const voucher = useDownloadVoucher();
  const receipt = useOpenReceipt();
  const undo = useUndoPayoutPaid();
  const [paying, setPaying] = useState<DistributionPayoutOut | null>(null);
  const [undoing, setUndoing] = useState<DistributionPayoutOut | null>(null);
  const [taxing, setTaxing] = useState<DistributionPayoutOut | null>(null);
  const money = (cents: number) => formatCentsExact(cents, run.currency);
  const live = run.status !== "canceled";
  return (
    <>
      <FormError error={voucher.error ?? receipt.error} />
      <div className="dw-payouts">
        <SimpleTable head={["Shareholder", "Eligible shares", "Ownership %", "Gross amount", "Tax withheld", "Net payable", "Payout method", "Status", "Actions"]}>
          {run.payouts.map((p) => (
            <tr key={p.id}>
              <td className="u-strong u-ink">{p.name}</td>
              <td className="data-table__mono">{count(p.shares)}</td>
              <td className="data-table__mono">{sharePct(p.shares, p.totalShares)}</td>
              <td className="data-table__mono">
                <Amount cents={p.grossCents} currency={run.currency} />
              </td>
              <td className="data-table__mono">
                <Amount cents={p.taxCents} currency={run.currency} /> ({bpsPct(p.taxBps)})
              </td>
              <td className="data-table__mono u-strong">
                <Amount cents={p.netCents} currency={run.currency} />
              </td>
              <td className="text-small">{p.payoutTo || "Not set"}</td>
              <td>
                {live ? (
                  <div className="stack stack--4">
                    <Badge tone={p.status === "paid" ? "green" : "cyan"}>{p.status === "paid" ? `Paid ${formatLong(p.paidOn)}` : "Ready to pay"}</Badge>
                    {p.issues.length > 0 && <span className="text-small">Not on record (optional): {p.issues.join(", ")}</span>}
                    {p.reference && <span className="text-small">Ref. {p.reference}</span>}
                    {p.notifiedAt && p.status !== "paid" && <span className="text-small">Emailed {formatLong(p.notifiedAt)}</span>}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="data-table__actions">
                {live && p.status === "ready" && (
                  <button type="button" className="row-action row-action--brand" aria-label={`Mark ${p.name} paid`} onClick={() => setPaying(p)}>
                    Mark as Paid
                  </button>
                )}
                {live && p.status !== "paid" && (
                  <button type="button" className="row-action" aria-label={`Edit tax for ${p.name}`} onClick={() => setTaxing(p)}>
                    Edit tax
                  </button>
                )}
                {live && (
                  <button
                    type="button"
                    className="row-action row-action--brand"
                    aria-label={`Voucher for ${p.name}`}
                    disabled={voucher.isPending}
                    onClick={() => voucher.mutate({ id: p.id, name: p.name })}
                  >
                    Voucher PDF
                  </button>
                )}
                {p.receiptName && (
                  <button type="button" className="row-action" aria-label={`Receipt for ${p.name}`} disabled={receipt.isPending} onClick={() => receipt.mutate(p.id)}>
                    Receipt
                  </button>
                )}
                {live && p.status === "paid" && (
                  <button type="button" className="row-action row-action--danger" aria-label={`Undo payment to ${p.name}`} disabled={undo.isPending} onClick={() => setUndoing(p)}>
                    Undo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </SimpleTable>
      </div>
      <span className="text-small">
        The voucher shows the payout and tax withheld. It isn’t a BIR form: final tax on dividends is normally certified on Form 2306 (2307 is for creditable tax), so issue the
        official one through your accountant.
      </span>
      {undoing && (
        <ConfirmDialog
          title={`Undo the payment to ${undoing.name}?`}
          icon="arrowLeft"
          confirmLabel="Yes, undo"
          pending={undo.isPending}
          error={undo.error}
          onClose={() => {
            setUndoing(null);
            undo.reset();
          }}
          onConfirm={() =>
            undo.mutate(undoing.id, {
              onSuccess: () => {
                setUndoing(null);
                notify(`${undoing.name} is back to unpaid.`);
              },
            })
          }
        >
          {money(undoing.netCents)} goes back to unpaid, and its reference and receipt are removed. An email already sent isn’t taken back.
        </ConfirmDialog>
      )}
      {paying && (
        <PaidModal
          payout={paying}
          currency={run.currency}
          today={today}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            notify(`${paying.name} is marked paid.`);
          }}
        />
      )}
      {taxing && (
        <TaxModal
          payout={taxing}
          onClose={() => setTaxing(null)}
          onDone={() => {
            setTaxing(null);
            notify("Tax updated.");
          }}
        />
      )}
    </>
  );
}

type Done = { onClose: () => void; onDone: () => void };

function PaidModal({ payout: p, currency, today, onClose, onDone }: Done & { payout: DistributionPayoutOut; currency: string; today: string }) {
  const save = useMarkPayoutPaid();
  const pesos = usePeso().text(p.netCents, currency);
  const [paidOn, setDay] = useState(today);
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notify, setNotify] = useState(!!p.email);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const check = () => {
    if (!paidOn || paidOn > today) return setError("Choose the day you paid, up to today.");
    setError("");
    setAsking(true);
  };
  const pay = () => {
    save.mutate({ id: p.id, paidOn, reference: reference.trim(), notify, receipt }, { onSuccess: onDone });
  };
  return (
    <FormModal
      id="pm-title"
      kicker="MARK AS PAID"
      title={`${formatCentsExact(p.netCents, currency)} to ${p.name}`}
      subtitle={p.payoutTo ? `Paid to ${p.payoutTo}. Only mark it once the money is sent.` : "No payout account is saved. Only mark it once the money is sent."}
      submitLabel="Mark as Paid"
      mutation={save}
      error={error}
      onSubmit={check}
      onClose={onClose}
    >
      {pesos && <span className="text-small">{pesos} at the current rate. The payout is recorded in {currency}.</span>}
      <div className="form-grid">
        <Field label="Bank reference no." htmlFor="pm-ref">
          <Input id="pm-ref" mono maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Paid on" htmlFor="pm-day" required>
          <Input id="pm-day" type="date" max={today} value={paidOn} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
      <Field label="Transfer receipt" htmlFor="pm-file" hint="PDF or image. The shareholder can open it.">
        <Input id="pm-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
      </Field>
      <Checkbox label={p.email ? `Email ${p.email} that it was sent` : "No email on file"} disabled={!p.email} checked={notify} onChange={(e) => setNotify(e.target.checked)} />
      {asking && (
        <ConfirmDialog
          title={`Mark ${p.name} as paid?`}
          icon="check"
          confirmLabel="Yes, mark as paid"
          pending={save.isPending}
          error={save.error}
          onClose={() => {
            setAsking(false);
            save.reset();
          }}
          onConfirm={pay}
        >
          Confirm you sent {formatCentsExact(p.netCents, currency)} to {p.name} on {formatLong(paidOn)}
          {reference.trim() ? `, reference ${reference.trim()}` : ""}. It shows as paid on their page{notify && p.email ? ` and ${p.email} is emailed` : ""}.
        </ConfirmDialog>
      )}
    </FormModal>
  );
}

function TaxModal({ payout: p, onClose, onDone }: Done & { payout: DistributionPayoutOut }) {
  const save = useSetPayoutTax();
  const [rate, setRate] = useState(String(p.taxBps / 100));
  const [error, setError] = useState("");
  const submit = () => {
    const bps = Math.round(Number(rate) * 100);
    if (rate.trim() === "" || !(bps >= 0 && bps <= 10_000)) return setError("Enter a rate from 0 to 100.");
    save.mutate({ id: p.id, taxBps: bps }, { onSuccess: onDone });
  };
  return (
    <FormModal
      id="tx-title"
      kicker="TAX WITHHELD"
      title={p.name}
      subtitle="Changes their net payout. They aren’t emailed about it."
      width={420}
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Tax %" htmlFor="tx-rate" required>
        <Input id="tx-rate" type="number" min={0} max={100} step="0.01" mono value={rate} onChange={(e) => setRate(e.target.value)} />
      </Field>
    </FormModal>
  );
}

function CancelModal({ run, onClose, onDone }: Done & { run: DistributionDetailOut }) {
  const cancel = useCancelDistribution();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const submit = () => (reason.trim() ? cancel.mutate({ id: run.id, reason: reason.trim() }, { onSuccess: onDone }) : setError("Enter why it’s canceled."));
  return (
    <FormModal
      id="cx-title"
      kicker="CANCEL DISTRIBUTION"
      title={run.title}
      subtitle="It leaves shareholders’ dashboards and this can’t be undone. You can delete it afterwards."
      submitLabel="Cancel distribution"
      mutation={cancel}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Reason" htmlFor="cx-why" required>
        <Textarea id="cx-why" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormModal>
  );
}
