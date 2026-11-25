"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, Input, LoadState, Modal, SearchBox, SegmentedControl, Select, Textarea } from "@/components/ui";
import {
  categoryLabel,
  count,
  dilutedTotal,
  ENTITY_TYPES,
  entityLabel,
  KYC_STATUSES,
  kycLabel,
  shareClassLabel,
  sharePct,
  STAKEHOLDER_CATEGORIES,
  TAX_STATUSES,
  taxLabel,
} from "@/data/shareholders";
import { avatarTone } from "@/lib/tones";
import { isEmail } from "@/lib/utils";
import type { InteractionIn, ShareholderOverviewOut, StakeholderIn, StakeholderOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useAddInteraction, useInteractions, useSaveRecord, useShareholders } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { PayoutProfileCard } from "./PayoutProfile";
import { FormModal, RowActions, SectionCard, SimpleTable } from "./shared";

const kycTone = (s: string) => (s === "verified" ? "green" : s === "expired" ? "red" : s === "pending" ? "amber" : "neutral");
const taxTone = (s: string) => (s === "received" ? "green" : s === "requested" ? "amber" : "neutral");

/** Shareholders › Shareholders: find a person or entity and manage the relationship. Ownership math is on Cap Table & Equity. */
export function DirectorySection() {
  const query = useShareholders();
  return (
    <LoadState query={query} loadingText="Loading shareholders…">
      {query.data && <Directory data={query.data} />}
    </LoadState>
  );
}

function Directory({ data }: { data: ShareholderOverviewOut }) {
  const { notify, update } = useAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "former">("active");
  const [category, setCategory] = useState("");
  const [openId, setOpenId] = useState("");
  const [editing, setEditing] = useState<StakeholderOut | "new" | null>(null);
  const q = search.trim().toLowerCase();
  const shown = data.stakeholders.filter(
    (s) => s.status === filter && (!category || s.category === category) && (!q || [s.name, s.contactName, s.email].some((v) => v.toLowerCase().includes(q))),
  );
  const open = data.stakeholders.find((s) => s.id === openId);
  const of = (status: string) => data.stakeholders.filter((s) => s.status === status).length;
  return (
    <>
      <SectionCard
        kicker={`SHAREHOLDERS · ${shown.length}`}
        action={
          <span className="cluster">
            <Button variant="outline" onClick={() => update({ tab: "settings", settingsTab: "team" })}>
              Invite a login
            </Button>
            <Button variant="primary" aria-haspopup="dialog" onClick={() => setEditing("new")}>
              + Add shareholder
            </Button>
          </span>
        }
        note="Someone needs the Shareholder role in Settings › Team to sign in. Once they accept the invite, link that login on their record here."
      >
        <div className="cluster">
          <SearchBox label="Search shareholders" value={search} onChange={setSearch} />
          <Select
            className="input--auto"
            aria-label="Kind of shareholder"
            placeholder="Everyone"
            value={category}
            options={STAKEHOLDER_CATEGORIES}
            onChange={(e) => setCategory(e.target.value)}
          />
          <SegmentedControl
            size="sm"
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: "Active", count: of("active") },
              { value: "former", label: "Former", count: of("former") },
            ]}
          />
        </div>
        <SimpleTable
          head={["Name", "Share %", "Kind", "Entity", "Tax form", "KYC", "Login", "Actions"]}
          empty={data.stakeholders.length ? "Nobody matches." : "No shareholders yet. Add founders, investors and advisors."}
        >
          {shown.map((s) => (
            <tr key={s.id}>
              <td>
                <div className="cluster cluster--nowrap">
                  <Avatar name={s.name} tone={avatarTone(s.id)} size="sm" />
                  <div className="stack stack--2">
                    <span className="u-strong u-ink">{s.name}</span>
                    <span className="text-small">{[s.contactName, s.email].filter(Boolean).join(" · ") || "—"}</span>
                  </div>
                </div>
              </td>
              <td className="data-table__mono">{sharePct(issuedOf(data, s.id), data.capTable.companyShares)}</td>
              <td>
                <Badge tone="purple">{categoryLabel(s.category)}</Badge>
              </td>
              <td>{entityLabel(s.entityType)}</td>
              <td>
                <Badge tone={taxTone(s.taxStatus)}>{taxLabel(s.taxStatus)}</Badge>
              </td>
              <td>
                <Badge tone={kycTone(s.kycStatus)}>{kycLabel(s.kycStatus)}</Badge>
              </td>
              <td className="text-small">{s.userId ? "Linked" : "None"}</td>
              <td className="data-table__actions">
                <button type="button" className="row-action row-action--brand" aria-label={`Open ${s.name}`} onClick={() => setOpenId(s.id)}>
                  Open
                </button>
                <button type="button" className="row-action row-action--brand" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </SimpleTable>
      </SectionCard>
      {open && <ProfileDrawer key={open.id} s={open} data={data} onClose={() => setOpenId("")} onEdit={() => setEditing(open)} />}
      {editing && (
        <StakeholderModal
          s={editing === "new" ? undefined : editing}
          data={data}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            notify(m);
          }}
        />
      )}
    </>
  );
}

/** Their issued shares (common and preferred). */
const issuedOf = (data: ShareholderOverviewOut, id: string) => data.capTable.holders.find((h) => h.stakeholderId === id)?.issued ?? 0;

function ProfileDrawer({ s, data, onClose, onEdit }: { s: StakeholderOut; data: ShareholderOverviewOut; onClose: () => void; onEdit: () => void }) {
  const notes = useInteractions(s.id);
  const holder = data.capTable.holders.find((h) => h.stakeholderId === s.id);
  const grants = data.capTable.grants.filter((g) => g.stakeholderId === s.id);
  const login = data.logins.find((l) => l.userId === s.userId);
  const rows: Array<[string, string]> = [
    ["Contact person", s.contactName],
    ["Email", s.email],
    ["Phone", s.phone],
    ["Country", s.country],
    ["Entity type", entityLabel(s.entityType)],
    ["Tax form", taxLabel(s.taxStatus)],
    ["KYC", kycLabel(s.kycStatus)],
    ["Login", login ? login.email : s.userId ? "Linked (no longer active)" : "None"],
  ];
  return (
    <Modal
      open
      variant="drawer"
      width={520}
      onClose={onClose}
      titleId="sh-profile"
      kicker={categoryLabel(s.category).toUpperCase()}
      title={s.name}
      media={<Avatar name={s.name} tone={avatarTone(s.id)} size="md" />}
      footer={
        <>
          <RowActions kind="stakeholders" id={s.id} name={s.name} onDeleted={onClose} />
          <span className="u-spacer" />
          <Button variant="primary" onClick={onEdit}>
            Edit details
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        <dl className="sh-facts">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {s.notes && <p className="sh-text">{s.notes}</p>}
        <div className="stack stack--8">
          <span className="kicker">HOLDING</span>
          {holder ? (
            <span className="text-small">
              {sharePct(holder.issued, data.capTable.companyShares)} of the company ({count(holder.issued)} shares), {sharePct(holder.fullyDiluted, dilutedTotal(data.capTable))} fully diluted
            </span>
          ) : (
            <span className="text-small">Nothing on the cap table yet.</span>
          )}
          {grants.map((g) => (
            <span key={g.id} className="text-small">
              {shareClassLabel(g.shareClass)} · {g.shareClass === "safe" ? formatCents(g.investedCents, data.results.currency) : `${count(g.shares)} shares`} · {formatLong(g.issuedOn)}
            </span>
          ))}
        </div>
        <PayoutProfileCard stakeholderId={s.id} name={s.name} />
        <div className="stack stack--10">
          <span className="kicker">COMMUNICATION</span>
          <AddInteraction stakeholderId={s.id} today={data.today} />
          <LoadState query={notes} inline isEmpty={!notes.data?.length} empty="No emails, calls or meetings logged yet.">
            {notes.data?.map((n) => (
              <div key={n.id} className="inset stack stack--4">
                <div className="cluster cluster--between">
                  <span className="text-small">
                    <b>{n.kind[0].toUpperCase() + n.kind.slice(1)}</b> · {formatLong(n.happenedOn)} · {n.authorName}
                  </span>
                  <RowActions kind="interactions" id={n.id} name="this entry" />
                </div>
                <p className="sh-text">{n.summary}</p>
              </div>
            ))}
          </LoadState>
        </div>
      </div>
    </Modal>
  );
}

function AddInteraction({ stakeholderId, today }: { stakeholderId: string; today: string }) {
  const add = useAddInteraction(stakeholderId);
  const [kind, setKind] = useState<InteractionIn["kind"]>("email");
  const [happenedOn, setDay] = useState(today);
  const [summary, setSummary] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !happenedOn) return;
    add.mutate({ kind, happenedOn, summary: summary.trim() }, { onSuccess: () => setSummary("") });
  };
  return (
    <form className="stack stack--8" onSubmit={submit}>
      <div className="cluster">
        <Select
          size="sm"
          className="input--auto"
          aria-label="Kind"
          value={kind}
          options={[
            { value: "email", label: "Email" },
            { value: "call", label: "Call" },
            { value: "meeting", label: "Meeting" },
            { value: "note", label: "Note" },
          ]}
          onChange={(e) => setKind(e.target.value as InteractionIn["kind"])}
        />
        <Input size="sm" className="input--auto" type="date" aria-label="Date" value={happenedOn} onChange={(e) => setDay(e.target.value)} />
        <Button type="submit" size="sm" variant="outline" disabled={add.isPending || !summary.trim()}>
          {add.isPending ? "Saving…" : "Log it"}
        </Button>
      </div>
      <Textarea aria-label="What was said" rows={2} maxLength={4000} placeholder="What was said or agreed" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <FormError error={add.error} />
    </form>
  );
}

function StakeholderModal({
  s,
  data,
  onClose,
  onSaved,
}: {
  s?: StakeholderOut;
  data: ShareholderOverviewOut;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const save = useSaveRecord("stakeholders");
  const [d, setD] = useState<StakeholderIn>({
    name: s?.name ?? "",
    contactName: s?.contactName ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    country: s?.country ?? "",
    category: (s?.category as StakeholderIn["category"]) ?? "angel",
    entityType: (s?.entityType as StakeholderIn["entityType"]) ?? "individual",
    taxStatus: (s?.taxStatus as StakeholderIn["taxStatus"]) ?? "missing",
    kycStatus: (s?.kycStatus as StakeholderIn["kycStatus"]) ?? "not_started",
    status: (s?.status as StakeholderIn["status"]) ?? "active",
    notes: s?.notes ?? "",
    userId: s?.userId ?? null,
  });
  // Share %: only sent when it's changed, so a rounded figure never nudges their shares.
  const total = data.capTable.companyShares;
  const mine = s ? issuedOf(data, s.id) : 0;
  const pctNow = mine ? String(Math.round((mine / total) * 1_000_000) / 10_000) : "";
  const [pct, setPct] = useState(pctNow);
  const left = Math.max(0, Math.floor(((total - data.capTable.issued + mine) / total) * 10_000) / 100);
  const [error, setError] = useState("");
  const set = (p: Partial<StakeholderIn>) => setD((x) => ({ ...x, ...p }));
  // Logins nobody else has; keep the current one selectable even if that account was removed.
  const taken = new Set(data.stakeholders.filter((x) => x.id !== s?.id).map((x) => x.userId));
  const logins = data.logins.filter((l) => !taken.has(l.userId)).map((l) => ({ value: l.userId, label: `${l.name} (${l.email})` }));
  const submit = () => {
    if (!d.name.trim()) return setError("Enter a name.");
    if (d.email && !isEmail(d.email)) return setError("Enter a valid email.");
    const share = Number(pct || 0);
    if (!(share >= 0 && share <= 100) || !/^\d*\.?\d{0,4}$/.test(pct.trim())) return setError("Enter a share % from 0 to 100, with up to 4 decimals.");
    // An account that was removed can't stay linked.
    const userId = data.logins.some((l) => l.userId === d.userId) ? d.userId : null;
    save.mutate({ id: s?.id, body: { ...d, name: d.name.trim(), userId, ...(pct.trim() !== pctNow && { sharePercent: share }) } }, { onSuccess: () => onSaved(`${d.name.trim()} was saved.`) });
  };
  return (
    <FormModal
      id="st-title"
      kicker="SHAREHOLDERS"
      title={s ? `Edit ${s.name}` : "Add a shareholder"}
      subtitle="A person or an entity. Add their TIN and payout details from their profile, not in the notes."
      width={640}
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Name" htmlFor="st-name" required>
          <Input id="st-name" maxLength={160} value={d.name} placeholder="Person, company or fund" onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Contact person" htmlFor="st-contact">
          <Input id="st-contact" maxLength={120} value={d.contactName} placeholder="For companies and funds" onChange={(e) => set({ contactName: e.target.value })} />
        </Field>
        <Field label="Kind" htmlFor="st-cat">
          <Select id="st-cat" value={d.category} options={STAKEHOLDER_CATEGORIES} onChange={(e) => set({ category: e.target.value as StakeholderIn["category"] })} />
        </Field>
        <Field label="Entity type" htmlFor="st-ent">
          <Select id="st-ent" value={d.entityType} options={ENTITY_TYPES} onChange={(e) => set({ entityType: e.target.value as StakeholderIn["entityType"] })} />
        </Field>
        <Field label="Email" htmlFor="st-email">
          <Input id="st-email" type="email" value={d.email} onChange={(e) => set({ email: e.target.value.trim() })} />
        </Field>
        <Field label="Phone" htmlFor="st-phone">
          <Input id="st-phone" type="tel" maxLength={40} value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Country" htmlFor="st-country">
          <Input id="st-country" maxLength={80} value={d.country} onChange={(e) => set({ country: e.target.value })} />
        </Field>
        <Field label="Status" htmlFor="st-status">
          <Select
            id="st-status"
            value={d.status}
            options={[
              { value: "active", label: "Active" },
              { value: "former", label: "Former" },
            ]}
            onChange={(e) => set({ status: e.target.value as StakeholderIn["status"] })}
          />
        </Field>
        <Field label="Tax form" htmlFor="st-tax">
          <Select id="st-tax" value={d.taxStatus} options={TAX_STATUSES} onChange={(e) => set({ taxStatus: e.target.value as StakeholderIn["taxStatus"] })} />
        </Field>
        <Field label="KYC" htmlFor="st-kyc">
          <Select id="st-kyc" value={d.kycStatus} options={KYC_STATUSES} onChange={(e) => set({ kycStatus: e.target.value as StakeholderIn["kycStatus"] })} />
        </Field>
      </div>
      <Field
        label="Share %"
        htmlFor="st-pct"
        hint={`How much of the company they get. ${left}% is available${s ? " to them" : ""}. ${Number(pct) > 0 ? `About ${count(Math.round((Number(pct) / 100) * total))} of ${count(total)} shares.` : ""}`}
      >
        <Input id="st-pct" type="number" min={0} max={100} step="any" mono placeholder="0" value={pct} onChange={(e) => (setPct(e.target.value), setError(""))} />
      </Field>
      <Field label="Login" htmlFor="st-login" hint="Links this record to what they see when they sign in.">
        <Select id="st-login" placeholder="No login" value={d.userId ?? ""} options={logins} onChange={(e) => set({ userId: e.target.value || null })} />
      </Field>
      <Field label="Notes" htmlFor="st-notes" hint="Only super admins see these.">
        <Textarea id="st-notes" rows={3} maxLength={10000} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </FormModal>
  );
}
