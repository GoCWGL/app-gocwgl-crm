"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Field,
  FormError,
  Icon,
  IconTile,
  Input,
  LoadState,
  Modal,
  SegmentedControl,
  Select,
  StatGrid,
  Textarea,
} from "@/components/ui";
import { BONUS_STATUS } from "@/data/affiliates";
import type { VaReferralOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import {
  useAffiliateProgram,
  useCreateVaReferral,
  useDeleteVaReferral,
  useMarkVaBonusPaid,
  useUndoVaBonusPaid,
  useUpdateVaReferral,
  useVaReferrals,
} from "@/utils/hooks/useAffiliates";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useVas } from "@/utils/hooks/useVas";
import { contactName } from "../../lib/contacts";
import { VA_STATUS } from "../../lib/vas";
import { useAdmin } from "../../state/AdminContext";
import { ProgramCard } from "./ProgramCard";

type Filter = "all" | "earned" | "pending" | "paid";
const KIND_LABEL = { va: "VA", client: "Client", name: "Not linked yet" } as const;

/** Finance › Referral bonus › VA referrals: who referred each VA, and the bonus once that VA is active. */
export function VaReferralsPanel({ canManage }: { canManage: boolean }) {
  const { notify } = useAdmin();
  const query = useVaReferrals();
  const referrals = query.data ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<VaReferralOut | "new" | null>(null);
  const [confirmRemove, setConfirmRemove] = useState("");
  const paid = useMarkVaBonusPaid();
  const undo = useUndoVaBonusPaid();
  const remove = useDeleteVaReferral();

  const sum = (s: Filter) => referrals.filter((r) => r.bonusStatus === s).reduce((t, r) => t + r.bonusCents, 0);
  const count = (s: Filter) => referrals.filter((r) => r.bonusStatus === s).length;
  const shown = filter === "all" ? referrals : referrals.filter((r) => r.bonusStatus === filter);
  const busy = (id: string) => [paid, undo, remove].some((m) => m.isPending && m.variables === id);

  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: "VA referrals", value: referrals.length, tone: "cyan", glyph: "#" },
          { label: "Bonuses to pay", value: formatCents(sum("earned")), tone: "amber", glyph: "$" },
          { label: "Bonuses pending", value: formatCents(sum("pending")), tone: "purple", glyph: "$" },
          { label: "Bonuses paid", value: formatCents(sum("paid")), tone: "green", glyph: "$" },
        ]}
      />

      <ProgramCard canManage={canManage} />

      <section className="card" aria-label="VA referrals">
        <div className="section-head">
          <span className="kicker">VA REFERRALS · {referrals.length}</span>
          {canManage && (
            <Button variant="primary" aria-haspopup="dialog" onClick={() => setEditing("new")}>
              + Add VA referral
            </Button>
          )}
        </div>
        <div className="affiliates-toolbar">
          <SegmentedControl
            size="sm"
            label="Filter VA referrals"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: referrals.length },
              { value: "earned", label: "To pay", count: count("earned") },
              { value: "pending", label: "Pending", count: count("pending") },
              { value: "paid", label: "Paid", count: count("paid") },
            ]}
          />
        </div>
        <FormError error={paid.error ?? undo.error ?? remove.error} />
        <LoadState
          query={query}
          isEmpty={!shown.length}
          empty={
            referrals.length
              ? "No VA referrals in this view."
              : "No VA referrals yet. VAs who apply saying a friend referred them show up here, or add one by hand."
          }
        >
          <div className="table-scroll">
            <table className="data-table data-table--plain">
              <thead>
                <tr>
                  <th>VA</th>
                  <th>Referred by</th>
                  <th>Bonus</th>
                  <th>Status</th>
                  {canManage && <th className="data-table__actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const bonus = BONUS_STATUS[r.bonusStatus];
                  const va = VA_STATUS[r.va.status];
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{r.va.name}</span>
                          <span className="text-small">{r.va.email}</span>
                          <span>
                            <Badge tone={va.tone} dot>
                              {va.label}
                            </Badge>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{r.referrer.name || "—"}</span>
                          <span className="text-small">
                            {KIND_LABEL[r.referrer.kind]}
                            {r.referrer.email ? ` · ${r.referrer.email}` : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{formatCents(r.bonusCents)}</span>
                          {r.customBonus && <span className="text-small">Own amount</span>}
                        </div>
                      </td>
                      <td>
                        <div className="stack stack--2">
                          <span>
                            <Badge tone={bonus.tone} dot>
                              {r.bonusStatus === "pending" ? "Pending · VA not active yet" : bonus.label}
                            </Badge>
                          </span>
                          {r.bonusPaidAt && <span className="text-small">Paid {formatShort(r.bonusPaidAt)}</span>}
                          {r.note && <span className="text-small">{r.note}</span>}
                        </div>
                      </td>
                      {canManage && (
                        <td className="data-table__actions">
                          {r.bonusStatus === "earned" && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busy(r.id)}
                              onClick={() => paid.mutate(r.id, { onSuccess: () => notify(`Bonus marked paid to ${r.referrer.name}.`) })}
                            >
                              Mark paid
                            </Button>
                          )}
                          {r.bonusStatus === "paid" && (
                            <Button size="sm" variant="outline" disabled={busy(r.id)} onClick={() => undo.mutate(r.id)}>
                              Undo paid
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                            Edit
                          </Button>
                          {confirmRemove === r.id ? (
                            <Button
                              size="sm"
                              variant="danger-solid"
                              disabled={busy(r.id)}
                              onClick={() => remove.mutate(r.id, { onSuccess: () => setConfirmRemove("") })}
                            >
                              Yes, remove
                            </Button>
                          ) : (
                            <Button size="sm" variant="danger" onClick={() => setConfirmRemove(r.id)}>
                              Remove
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </LoadState>
      </section>

      {editing && <VaReferralModal referral={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Add / edit

type ReferrerKind = "va" | "client" | "name";

function VaReferralModal({ referral, onClose }: { referral: VaReferralOut | null; onClose: () => void }) {
  const { notify } = useAdmin();
  const program = useAffiliateProgram().data;
  const vas = useVas().data?.vas ?? [];
  const create = useCreateVaReferral();
  const save = useUpdateVaReferral();
  const isNew = !referral;
  const paidAlready = referral?.bonusStatus === "paid";

  const [vaId, setVaId] = useState(referral?.va.id ?? "");
  const [kind, setKind] = useState<ReferrerKind>(referral?.referrer.kind ?? "va");
  const [referrerVaId, setReferrerVaId] = useState(referral?.referrer.kind === "va" ? (referral.referrer.id ?? "") : "");
  const [referrerContact, setReferrerContact] = useState<{ id: string; name: string } | null>(
    referral?.referrer.kind === "client" && referral.referrer.id ? { id: referral.referrer.id, name: referral.referrer.name } : null,
  );
  const [referrerName, setReferrerName] = useState(referral?.referrerName ?? "");
  const [ownAmount, setOwnAmount] = useState(!!referral?.customBonus);
  const [amount, setAmount] = useState(referral ? centsToDollars(referral.bonusCents) : centsToDollars(program?.vaBonusCents ?? 2500));
  const [note, setNote] = useState(referral?.note ?? "");
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const contacts = useContactsPage({ q, limit: 8 });
  const [tried, setTried] = useState(false);

  const missing =
    (isNew && !vaId && "Choose the VA who was referred.") ||
    (kind === "va" && !referrerVaId && "Choose the VA who referred them.") ||
    (kind === "client" && !referrerContact && "Choose the client who referred them.") ||
    (kind === "name" && !referrerName.trim() && "Type who referred them.") ||
    "";
  const pending = create.isPending || save.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (missing) return;
    const referrer = {
      referrerVaId: kind === "va" ? referrerVaId : null,
      referrerContactId: kind === "client" ? referrerContact!.id : null,
      referrerName: kind === "name" ? referrerName.trim() : "",
    };
    const bonusCents = ownAmount ? dollarsToCents(amount) : null;
    const done = () => {
      notify(isNew ? "VA referral added." : "VA referral saved.");
      onClose();
    };
    if (isNew) {
      create.mutate({ vaId, ...referrer, bonusCents, note: note.trim() }, { onSuccess: done });
    } else {
      save.mutate(
        { id: referral.id, body: { ...referrer, ...(!paidAlready && { bonusCents }), note: note.trim() } },
        { onSuccess: done },
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="va-referral"
      kicker="VA REFERRAL"
      title={isNew ? "Add a VA referral" : `Referral for ${referral.va.name}`}
      subtitle={`The referrer earns the bonus once the VA is active (program bonus: ${formatCents(program?.vaBonusCents ?? 2500)}).`}
      width={540}
      media={
        <IconTile brand size="lg">
          <Icon name="userPlus" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : isNew ? "Add referral" : "Save"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={create.error ?? save.error} />
        {isNew && (
          <Field label="Referred VA" htmlFor="vr-va" required>
            <Select
              id="vr-va"
              value={vaId}
              placeholder="Choose a VA"
              options={vas.map((v) => ({ value: v.id, label: `${v.fullName} · ${v.email}` }))}
              onChange={(e) => setVaId(e.target.value)}
            />
          </Field>
        )}

        <Field label="Referred by">
          <SegmentedControl<ReferrerKind>
            kind="radio"
            variant="soft"
            size="sm"
            label="Referred by"
            value={kind}
            onChange={setKind}
            options={[
              { value: "va", label: "A VA" },
              { value: "client", label: "A client" },
              { value: "name", label: "Someone else" },
            ]}
          />
        </Field>
        {kind === "va" && (
          <Field label="VA who referred them" htmlFor="vr-ref-va">
            <Select
              id="vr-ref-va"
              value={referrerVaId}
              placeholder="Choose a VA"
              options={vas.filter((v) => v.id !== (referral?.va.id ?? vaId)).map((v) => ({ value: v.id, label: `${v.fullName} · ${v.email}` }))}
              onChange={(e) => setReferrerVaId(e.target.value)}
            />
          </Field>
        )}
        {kind === "client" && (
          <Field label="Client who referred them" htmlFor="vr-ref-client">
            {referrerContact ? (
              <div className="cluster cluster--between inset inset--soft">
                <span className="text-strong">{referrerContact.name}</span>
                <Button size="sm" variant="outline" onClick={() => setReferrerContact(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="stack stack--6">
                <Input id="vr-ref-client" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
                {(contacts.data?.items ?? []).map((c) => (
                  <button key={c.id} type="button" className="link-card" onClick={() => setReferrerContact({ id: c.id, name: contactName(c) })}>
                    <span className="stack stack--2 u-grow">
                      <span className="text-strong">{contactName(c)}</span>
                      <span className="text-tiny">{[c.company, c.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Icon name="plus" size={14} />
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        {kind === "name" && (
          <Field label="Their name" htmlFor="vr-ref-name">
            <Input id="vr-ref-name" maxLength={120} value={referrerName} onChange={(e) => setReferrerName(e.target.value)} />
          </Field>
        )}
        {!isNew && referral.referrerName && kind !== "name" && (
          <span className="text-small">On their application: “{referral.referrerName}”.</span>
        )}

        {paidAlready ? (
          <div className="notice notice--info" role="status">
            The {formatCents(referral.bonusCents)} bonus is paid. Undo the payment to change the amount.
          </div>
        ) : (
          <>
            <Checkbox brand label="Give this referral its own bonus amount" checked={ownAmount} onChange={() => setOwnAmount(!ownAmount)} />
            {ownAmount && (
              <Field label="Bonus (USD)" htmlFor="vr-amount">
                <Input id="vr-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            )}
          </>
        )}
        <Field label="Team note" htmlFor="vr-note" hint="Only your team sees this, e.g. how the bonus was paid.">
          <Textarea id="vr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {tried && missing && (
          <p className="text-error" role="alert">
            {missing}
          </p>
        )}
      </div>
    </Modal>
  );
}
