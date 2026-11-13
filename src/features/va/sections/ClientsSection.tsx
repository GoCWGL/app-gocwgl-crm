"use client";

import { useVaAccess } from "../lib/access";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Field, FormError, Icon, Input, LoadState, Modal, SearchBox, Tabs, Textarea } from "@/components/ui";
import { formatDuration, useNow } from "@/lib/duration";
import { cn } from "@/lib/utils";
import type { MyClientOut } from "@/utils/api/models";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useAcceptRate, useClockIn, useMyClients, useMyShift, useRequestRaise, useSetMyClientRate, useWithdrawRaise } from "@/utils/hooks/useShifts";
import { EntryLabelChips, type TagColor } from "../components/EntryLabels";
import { useApproveInactive, useInactiveAsks } from "@/utils/hooks/useVaPortal";
import type { InactiveAskOut } from "@/utils/api/models";
import { clientColors, clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";

type View = "active" | "inactive";

/** VA portal › Clients: the businesses a VA supports now, and the ones they used to. */
export function ClientsSection() {
  const va = useVaAccess().ready;
  const query = useMyClients(va);
  const shift = useMyShift(va);
  const [view, setView] = useState<View>("active");
  const [search, setSearch] = useState("");
  const colors = useMemo(() => clientColors(query.data?.clients), [query.data]);
  const all = query.data?.clients ?? [];
  const q = search.trim().toLowerCase();

  const active = all.filter((c) => c.active);
  const inactive = all.filter((c) => !c.active);
  const list = (view === "active" ? active : inactive).filter((c) => !q || `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q));
  const month = active.reduce((t, c) => ({ secs: t.secs + c.monthSeconds, cents: t.cents + c.monthEarningsCents }), { secs: 0, cents: 0 });
  const runningFor = shift.data?.shift?.client?.id;
  const { readOnly } = useVaAccess();
  const usual = query.data?.defaultRateCents ?? null;
  const [profileId, setProfileId] = useState("");
  const [rateId, setRateId] = useState("");
  const [raiseId, setRaiseId] = useState("");
  const now = useNow(60_000);
  const profile = all.find((c) => c.id === profileId);
  const rating = all.find((c) => c.id === rateId);
  const raising = all.find((c) => c.id === raiseId);
  // Clients GoCWGL wants to move to inactive (the VA talks to them first, then approves).
  const asks = useInactiveAsks(va).data ?? [];
  const askFor = (id: string) => asks.find((a) => a.contactId === id) ?? null;

  return (
    <div className="page-stack">
      <div className="card va-clients-sum">
        <SumStat icon="briefcase" label="Active clients" value={String(active.length)} />
        <SumStat icon="clock" label="Hours this month" value={formatDuration(month.secs)} />
        <SumStat icon="dollar" label="Earned this month" value={formatCentsExact(month.cents)} tone="green" />
        <SumStat
          icon="tag"
          label="Your hourly rate"
          value={query.data?.defaultRateCents != null ? `${formatCentsExact(query.data.defaultRateCents)}/h` : "Not set"}
        />
      </div>

      <div className="card card--flat board">
        <div className="board__bar">
          <Tabs<View>
            label="Clients"
            value={view}
            onChange={setView}
            options={[
              { value: "active", label: "Active clients", hint: "You work with them now", icon: "briefcase", tone: "green", count: query.isPending ? "–" : active.length },
              { value: "inactive", label: "Inactive clients", hint: "You used to support them", icon: "folder", tone: "slate", count: query.isPending ? "–" : inactive.length },
            ]}
          />
          <div className="board__actions">
            <SearchBox label="Search clients" placeholder="Search clients" value={search} onChange={setSearch} />
          </div>
        </div>

        <LoadState query={query} loadingText="Loading your clients…">
          {list.length === 0 ? (
            <div className="board__empty">
              <span className={cn("board__empty-icon", view === "active" ? "tone-green" : "tone-slate")} aria-hidden="true">
                <Icon name="briefcase" size={18} />
              </span>
              <span className="text-strong">
                {q ? `No clients match “${search.trim()}”` : view === "active" ? "No active clients yet" : "No past clients"}
              </span>
              <span className="text-small">
                {view === "active"
                  ? "Once GoCWGL places you with a client, they’ll show up here."
                  : "Clients you stop supporting move here, with the hours you worked for them."}
              </span>
            </div>
          ) : (
            <div className="va-client-grid">
              {list.map((c) => (
                <ClientCard
                  key={c.id}
                  c={c}
                  color={colors.get(c.id) ?? "#94a3b8"}
                  running={runningFor === c.id}
                  canEdit={!readOnly}
                  onProfile={() => setProfileId(c.id)}
                  onRate={() => setRateId(c.id)}
                  raise={
                    <>
                      {askFor(c.id) && <InactiveAsk ask={askFor(c.id)!} canEdit={!readOnly} />}
                      <RaiseLine c={c} now={now} canEdit={!readOnly} onRaise={() => setRaiseId(c.id)} onChangeRate={() => setRateId(c.id)} />
                    </>
                  }
                />
              ))}
            </div>
          )}
        </LoadState>
      </div>

      {profile && (
        <ClientProfile
          c={profile}
          color={colors.get(profile.id) ?? "#94a3b8"}
          raise={
            <RaiseLine c={profile} now={now} canEdit={!readOnly} onRaise={() => setRaiseId(profile.id)} onChangeRate={() => setRateId(profile.id)} />
          }
          onClose={() => setProfileId("")}
        />
      )}
      {rating && <RateModal c={rating} usual={usual} onClose={() => setRateId("")} />}
      {raising && <RaiseModal c={raising} onClose={() => setRaiseId("")} />}
    </div>
  );
}

function SumStat({ icon, label, value, tone }: { icon: "briefcase" | "clock" | "dollar" | "tag"; label: string; value: string; tone?: "green" }) {
  return (
    <div className={cn("va-clients-sum__stat", tone && `is-${tone}`)}>
      <span className="va-clients-sum__icon" aria-hidden="true">
        <Icon name={icon} size={15} />
      </span>
      <span className="stack stack--2">
        <span className="va-clients-sum__label">{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function ClientCard({
  c,
  color,
  running,
  canEdit,
  onProfile,
  onRate,
  raise,
}: {
  c: MyClientOut;
  color: string;
  running: boolean;
  canEdit: boolean;
  onProfile: () => void;
  onRate: () => void;
  raise: ReactNode;
}) {
  const { goTo } = useVa();
  const start = useClockIn();
  const name = clientLabel(c);
  const site = c.website ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";

  return (
    <article className={cn("va-client", !c.active && "is-inactive")} style={{ ["--client" as string]: color }}>
      <header className="va-client__head">
        <Avatar name={name} size="lg" square />
        <span className="stack stack--2 u-grow u-minw0">
          <span className="va-client__name u-truncate">{name}</span>
          {c.company && <span className="text-small u-truncate">{c.name}</span>}
        </span>
        {c.active ? (
          running ? (
            <Badge tone="green" dot>
              Tracking now
            </Badge>
          ) : (
            <Badge tone="green">Active</Badge>
          )
        ) : (
          <Badge tone="slate">Ended {c.endedAt ? formatShort(c.endedAt) : ""}</Badge>
        )}
      </header>

      <ul className="va-client__contact">
        {c.email && (
          <li>
            <Icon name="mail" size={13} />
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </li>
        )}
        {c.phone && (
          <li>
            <Icon name="phone" size={13} />
            <a href={`tel:${c.phone}`}>{c.phone}</a>
          </li>
        )}
        {site && (
          <li>
            <Icon name="globe" size={13} />
            <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
              {site}
            </a>
          </li>
        )}
      </ul>

      <dl className="va-client__stats">
        <div>
          <dt>This month</dt>
          <dd>{formatDuration(c.monthSeconds)}</dd>
        </div>
        <div>
          <dt>Earned</dt>
          <dd className="is-money">{formatCentsExact(c.monthEarningsCents)}</dd>
        </div>
        <div>
          <dt>All time</dt>
          <dd>{formatDuration(c.totalSeconds)}</dd>
        </div>
        <div>
          <dt>Your rate</dt>
          <dd>
            {c.rateCents == null && c.active && canEdit && !c.rateLocked ? (
              <button type="button" className="va-client__rate" onClick={onRate}>
                Set rate <Icon name="edit" size={11} />
              </button>
            ) : c.rateCents != null ? (
              `${formatCentsExact(c.rateCents)}/h`
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {c.active && raise}

      <footer className="va-client__foot">
        <span className="text-small">
          Since {formatShort(c.since)}
          {c.lastWorkedAt ? ` · last worked ${formatRelative(c.lastWorkedAt)}` : " · no time logged yet"}
        </span>
        {!c.active && (
          <Button size="sm" variant="outline" onClick={onProfile}>
            View profile
          </Button>
        )}
        {c.active && (
          <span className="cluster cluster--6">
            <Button size="sm" variant="outline" onClick={onProfile}>
              View profile
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={running || start.isPending}
              onClick={() => start.mutate({ contactId: c.id, stopRunning: true }, { onSuccess: () => goTo("time") })}
            >
              <Icon name="play" size={12} /> {running ? "Tracking" : "Start timer"}
            </Button>
          </span>
        )}
      </footer>
      <FormError error={start.error} />
    </article>
  );
}

const money = (cents: number | null | undefined) => (cents != null ? `${formatCentsExact(cents)}/h` : "Not set");

/** The client's profile, for the VA: contact details, how long they've worked together, their rate and tags. */
function ClientProfile({
  c,
  color,
  raise,
  onClose,
}: {
  c: MyClientOut;
  color: string;
  raise: ReactNode;
  onClose: () => void;
}) {
  const { goTo } = useVa();
  const name = clientLabel(c);
  const site = c.website ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  const tagColors = new Map(c.tags.map((t) => [t.name, t.color as TagColor]));
  return (
    <Modal open variant="drawer" onClose={onClose} titleId="va-client-profile" kicker="CLIENT PROFILE" title={name} width={480}>
      <div className="stack stack--16 va-cp" style={{ ["--client" as string]: color }}>
        <div className="va-cp__head">
          <Avatar name={name} size="lg" square />
          <span className="stack stack--2 u-minw0">
            <strong className="va-cp__name">{name}</strong>
            {c.company && c.name && <span className="text-small">Contact: {c.name}</span>}
            <span className="text-small">
              {c.active ? `Working together since ${formatShort(c.since)}` : `Worked together ${formatShort(c.since)} – ${c.endedAt ? formatShort(c.endedAt) : ""}`}
            </span>
          </span>
          <Badge tone={c.active ? "green" : "slate"}>{c.active ? "Active" : "Ended"}</Badge>
        </div>

        <section className="va-cp__section">
          <h3>Contact</h3>
          <ul className="va-client__contact">
            {c.email && (
              <li>
                <Icon name="mail" size={13} />
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </li>
            )}
            {c.phone && (
              <li>
                <Icon name="phone" size={13} />
                <a href={`tel:${c.phone}`}>{c.phone}</a>
              </li>
            )}
            {site && (
              <li>
                <Icon name="globe" size={13} />
                <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
                  {site}
                </a>
              </li>
            )}
            {!c.email && !c.phone && !site && <li className="text-small">No contact details yet.</li>}
          </ul>
        </section>

        <section className="va-cp__section">
          <h3>Your rate</h3>
          <div className="va-cp__rate">
            <span className="stack stack--2">
              <strong>{money(c.rateCents)}</strong>
              <span className="text-small">
                {c.rateSince ? `Fixed since ${formatShort(c.rateSince)}` : c.customRate ? "Your rate for this client" : "Your usual rate"}
              </span>
            </span>

          </div>
          {c.active && raise}
        </section>

        <section className="va-cp__section">
          <h3>Your time</h3>
          <dl className="va-client__stats">
            <div>
              <dt>This month</dt>
              <dd>{formatDuration(c.monthSeconds)}</dd>
            </div>
            <div>
              <dt>Earned</dt>
              <dd className="is-money">{formatCentsExact(c.monthEarningsCents)}</dd>
            </div>
            <div>
              <dt>All time</dt>
              <dd>{formatDuration(c.totalSeconds)}</dd>
            </div>
            <div>
              <dt>Last worked</dt>
              <dd>{c.lastWorkedAt ? formatRelative(c.lastWorkedAt) : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="va-cp__section">
          <h3>Their tags</h3>
          {c.tags.length ? (
            <EntryLabelChips tags={c.tags.map((t) => t.name)} colors={tagColors} />
          ) : (
            <span className="text-small">No tags yet. You can add one from the tag picker on the Time tracker.</span>
          )}
        </section>

        {c.active && (
          <Button variant="outline" onClick={() => goTo("time")}>
            <Icon name="clock" size={14} /> Open the Time tracker
          </Button>
        )}
      </div>
    </Modal>
  );
}

/** Set your hourly rate for one client (e.g. they agreed to $9 instead of your usual $8). */
function RateModal({ c, usual, onClose }: { c: MyClientOut; usual: number | null; onClose: () => void }) {
  const save = useSetMyClientRate();
  const [value, setValue] = useState(c.customRate && c.rateCents != null ? (c.rateCents / 100).toFixed(2) : "");
  const cents = value.trim() === "" ? null : Math.round(Number(value) * 100);
  const invalid = cents === null || !Number.isFinite(cents) || cents < 0 || cents > 100_000_00;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    save.mutate({ contactId: c.id, rateCents: cents }, { onSuccess: onClose });
  };
  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="va-client-rate"
      kicker="YOUR RATE"
      title={`Your rate for ${clientLabel(c)}`}
      subtitle={`${clientLabel(c)} approves it; until then your current rate stays. You can do this once per client; after that, you can ask for a $1 raise every 6 months.`}
      width={480}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={invalid || save.isPending}>
            {save.isPending ? "Sending…" : "Send for approval"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={save.error} />
        <Field label="Per hour (USD)" htmlFor="va-rate" error={value.trim() && invalid ? "Enter an amount like 9 or 9.50." : undefined}>
          <Input
            id="va-rate"
            type="number"
            min={0}
            step={0.25}
            inputMode="decimal"
            autoFocus
            placeholder={usual != null ? (usual / 100).toFixed(2) : "9.00"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <p className="text-small">
          Your current rate for them is {money(c.rateCents ?? usual)}. Once {clientLabel(c)} approves, time you log from then on uses the new rate,
          and they see your time’s value at it. You can withdraw it before they answer.
        </p>
      </div>
    </Modal>
  );
}

/** The raise line on a client: a pending request (with Withdraw), when the next one opens, or the button to ask. */
function RaiseLine({
  c,
  now,
  canEdit,
  onRaise,
  onChangeRate,
}: {
  c: MyClientOut;
  now: number;
  canEdit: boolean;
  onRaise: () => void;
  onChangeRate: () => void;
}) {
  const withdraw = useWithdrawRaise();
  const [keeping, setKeeping] = useState(false);
  const req = c.raiseRequest;
  const opens = new Date(c.raiseAvailableAt).getTime();
  if (req?.status === "pending") {
    return (
      <div className="va-raise is-pending">
        <Icon name="clock" size={14} />
        <span className="u-grow">
          {req.kind === "rate" ? "New rate sent" : "Raise requested"}: {money(req.fromCents)} → <strong>{money(req.toCents)}</strong>. Waiting for{" "}
          {clientLabel(c)} to approve.
        </span>
        {canEdit && (
          <button type="button" className="va-raise__link" onClick={() => withdraw.mutate(c.id)} disabled={withdraw.isPending}>
            Withdraw
          </button>
        )}
      </div>
    );
  }
  // Not decided yet: are they okay with this rate? Keeping it fixes it for 6 months; changing it goes to the client.
  if (!c.rateLocked && c.rateCents != null) {
    const until = formatShort(new Date(now + 182 * 86_400_000).toISOString());
    return (
      <div className="va-raise is-ask">
        <Icon name="dollar" size={14} />
        <span className="u-grow">
          Are you okay with <strong>{money(c.rateCents)}</strong> for {clientLabel(c)}?
        </span>
        {canEdit && (
          <span className="cluster cluster--6">
            <Button size="sm" variant="outline" onClick={onChangeRate}>
              Change rate
            </Button>
            <Button size="sm" variant="primary" onClick={() => setKeeping(true)}>
              Yes, keep it
            </Button>
          </span>
        )}
        {keeping && <KeepRate c={c} until={until} onClose={() => setKeeping(false)} />}
      </div>
    );
  }
  const what = req?.kind === "rate" ? "New rate" : "Raise";
  const last =
    req?.status === "approved" ? `${what} of ${money(req.toCents)} approved.` : req?.status === "declined" ? `${what} of ${money(req.toCents)} declined.` : "";
  if (c.rateCents == null) return null;
  return now >= opens ? (
    <div className="va-raise">
      <Icon name="trendUp" size={14} />
      <span className="u-grow">
        {last ? `${last} ` : ""}You can ask for a $1 raise ({money(c.rateCents)} → {money(c.rateCents + 100)}).
      </span>
      {canEdit && (
        <Button size="sm" variant="outline" onClick={onRaise}>
          Request raise
        </Button>
      )}
    </div>
  ) : (
    <div className="va-raise is-waiting">
      <Icon name="calendar" size={14} />
      <span className="u-grow">
        {last ? `${last} ` : ""}Next raise request from {formatShort(c.raiseAvailableAt)}.
      </span>
    </div>
  );
}

/** Ask a client for $1/h more, with a short note. */
function RaiseModal({ c, onClose }: { c: MyClientOut; onClose: () => void }) {
  const ask = useRequestRaise();
  const [note, setNote] = useState("");
  const from = c.rateCents ?? 0;
  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        ask.mutate({ contactId: c.id, note: note.trim() }, { onSuccess: onClose });
      }}
      titleId="va-raise"
      kicker="RAISE REQUEST"
      title={`Ask ${clientLabel(c)} for a raise`}
      subtitle="A raise is $1 an hour. They approve or decline it in their portal; if they approve, it applies to time you log from then on."
      width={500}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={ask.isPending}>
            {ask.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="stack stack--14">
        <FormError error={ask.error} />
        <div className="va-raise-amount">
          <span>
            <span className="text-small">Now</span>
            <strong>{money(from)}</strong>
          </span>
          <Icon name="arrowRight" size={16} />
          <span>
            <span className="text-small">Asking for</span>
            <strong className="is-new">{money(from + 100)}</strong>
          </span>
        </div>
        <Field label="Note to the client (optional)" htmlFor="va-raise-note">
          <Textarea
            id="va-raise-note"
            rows={4}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What you’ve taken on in the last six months, results you’re proud of…"
          />
        </Field>
        <p className="text-small">You can ask each client once every 6 months.</p>
      </div>
    </Modal>
  );
}

/** Confirm keeping the current rate: it's fixed until a raise can be asked for. */
function KeepRate({ c, until, onClose }: { c: MyClientOut; until: string; onClose: () => void }) {
  const keep = useAcceptRate();
  return (
    <ConfirmDialog
      title={`Keep ${money(c.rateCents)} for ${clientLabel(c)}?`}
      confirmLabel="Yes, keep this rate"
      icon="check"
      pending={keep.isPending}
      error={keep.error}
      onConfirm={() => keep.mutate(c.id, { onSuccess: onClose })}
      onClose={onClose}
    >
      You’ll stay at {money(c.rateCents)} with {clientLabel(c)} until {until}. After that you can ask them for a $1 raise. This is your one rate decision for
      this client, so you won’t be able to change it another way.
    </ConfirmDialog>
  );
}

/** GoCWGL plans to move this client to inactive: talk to them first, then approve so GoCWGL can finish it. */
function InactiveAsk({ ask, canEdit }: { ask: InactiveAskOut; canEdit: boolean }) {
  const approve = useApproveInactive();
  const [confirming, setConfirming] = useState(false);
  if (ask.approvedAt) {
    return (
      <div className="va-raise is-waiting">
        <Icon name="check" size={14} />
        <span className="u-grow">You approved moving {ask.clientName} to inactive. GoCWGL will finish it.</span>
      </div>
    );
  }
  return (
    <div className="va-raise is-pending va-inactive-ask">
      <Icon name="bell" size={14} />
      <span className="u-grow">
        <strong>GoCWGL plans to move {ask.clientName} to inactive</strong> ({ask.role}). Please talk with them first, then approve.
      </span>
      {canEdit && (
        <Button size="sm" variant="primary" onClick={() => setConfirming(true)}>
          Approve
        </Button>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Approve moving ${ask.clientName} to inactive?`}
          confirmLabel="Yes, approve"
          icon="check"
          pending={approve.isPending}
          error={approve.error}
          onConfirm={() => approve.mutate(ask.requestId, { onSuccess: () => setConfirming(false) })}
          onClose={() => setConfirming(false)}
        >
          Approve once you’ve talked with {ask.clientName}. GoCWGL then moves them to your inactive clients: you won’t log time for them any more, and
          your past time and invoices stay.
        </ConfirmDialog>
      )}
    </div>
  );
}
