"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Avatar, Button, Field, FormError, Icon, Input, Modal, SearchBox, Select, Textarea, Toggle } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { useContactsPage } from "@/utils/hooks/useContacts";
import type { JobPostingOut, VaRequestIn, VaRequestOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents } from "@/utils/format/money";
import { useUpdateJobPosting } from "@/utils/hooks/useJobPostings";
import { useRequestVa, useStaffCreateVaRequest, useStaffUpdateVaRequest, useUpdateMyVaRequest } from "@/utils/hooks/useClientWork";
import { usePortal } from "../state/PortalContext";

type Engagement = NonNullable<VaRequestIn["engagement"]>;

type Hours = 10 | 20 | 40;

/** Expected working hours: the only choices a client has. */
const LOADS = [
  { value: "10", label: "10 hours a week", engagement: "part_time", hours: 10 },
  { value: "20", label: "20 hours a week", engagement: "part_time", hours: 20 },
  { value: "40", label: "40 hours a week", engagement: "full_time", hours: 40 },
  { value: "project", label: "Open project", engagement: "project", hours: null },
] as const satisfies ReadonlyArray<{ value: string; label: string; engagement: Engagement; hours: Hours | null }>;
const DAYS = ["Mon–Fri", "Mon–Sat", "Every day", "Weekends", "Flexible"];
/** label shown and stored · IANA zones that map to it (to pre-pick the client's own). */
const ZONES: Array<{ label: string; iana: string[] }> = [
  { label: "US Eastern (New York)", iana: ["America/New_York", "America/Detroit", "America/Toronto", "America/Indiana/Indianapolis"] },
  { label: "US Central (Chicago)", iana: ["America/Chicago", "America/Winnipeg", "America/Mexico_City"] },
  { label: "US Mountain (Denver)", iana: ["America/Denver", "America/Phoenix", "America/Edmonton"] },
  { label: "US Pacific (Los Angeles)", iana: ["America/Los_Angeles", "America/Vancouver"] },
  { label: "Alaska (Anchorage)", iana: ["America/Anchorage"] },
  { label: "Hawaii (Honolulu)", iana: ["Pacific/Honolulu"] },
  { label: "UK (London)", iana: ["Europe/London", "Europe/Dublin"] },
  { label: "Central Europe (Berlin, Paris)", iana: ["Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam"] },
  { label: "Gulf (Dubai)", iana: ["Asia/Dubai"] },
  { label: "Singapore / Philippines (Manila)", iana: ["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong"] },
  { label: "Australia Eastern (Sydney)", iana: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane"] },
  { label: "New Zealand (Auckland)", iana: ["Pacific/Auckland"] },
];

function myZone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return ZONES.find((z) => z.iana.includes(tz))?.label ?? "";
}
/** "9:00 AM" → "09:00" (for editing a saved schedule). */
function to24(t: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return "";
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** "Mon–Fri, 9:00 AM – 5:00 PM" → its days and times; "Flexible hours" → Flexible. */
function parseSchedule(schedule: string): { days: string; from: string; to: string } {
  if (/^flexible/i.test(schedule)) return { days: "Flexible", from: "09:00", to: "17:00" };
  const [days, times = ""] = schedule.split(/,\s*/, 2);
  const [a = "", b = ""] = times.split(/\s*[–-]\s*/);
  return { days: DAYS.includes(days) ? days : "Mon–Fri", from: to24(a) || "09:00", to: to24(b) || "17:00" };
}

const lines = (xs: string[]) => (xs.length ? [...xs] : [""]);

/** "09:00" → "9:00 AM". */
function ampm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Client portal › VAs › Request a VA: the role they need, sent to GoCWGL to review and post to VAs. */
export function VaRequestModal({ onClose, onSent }: { onClose: () => void; onSent?: () => void }) {
  const { notify } = usePortal();
  return <VaRequestForm onClose={onClose} onSent={onSent} notify={notify} />;
}

/**
 * The Request a VA form. Clients use it from Team; GoCWGL staff use it (with `staff`) from Job postings › New job posting,
 * picking the client it's for and whether to publish it to Open jobs straight away.
 */
export function VaRequestForm({
  onClose,
  onSent,
  notify,
  staff,
  edit,
  posting,
  onFullView,
}: {
  onClose: () => void;
  onSent?: () => void;
  notify: (message: string) => void;
  staff?: boolean;
  /** Edit this request instead of making a new one (staff any time; the client while it's New or In review). */
  edit?: VaRequestOut;
  /** Staff, editing: the job post made from the request (its pay range is edited here too). */
  posting?: JobPostingOut | null;
  /** Staff, editing from a job card: open the request's full page. */
  onFullView?: () => void;
}) {
  const request = useRequestVa();
  const staffCreate = useStaffCreateVaRequest();
  const staffEdit = useStaffUpdateVaRequest();
  const clientEdit = useUpdateMyVaRequest();
  const savePosting = useUpdateJobPosting();
  const [payMin, setPayMin] = useState(posting?.rateMinCents != null ? centsToDollars(posting.rateMinCents) : "");
  const [payMax, setPayMax] = useState(posting?.rateMaxCents != null ? centsToDollars(posting.rateMaxCents) : "");
  const mutation = edit ? (staff ? staffEdit : clientEdit) : staff ? staffCreate : request;
  const busy = mutation.isPending || savePosting.isPending;
  const saved = edit ? parseSchedule(edit.schedule) : null;
  const [client, setClient] = useState<{ id: string; label: string } | null>(null);
  const [publish, setPublish] = useState(true);
  const [title, setTitle] = useState(edit?.role ?? "");
  const [days, setDays] = useState(saved?.days ?? "Mon–Fri");
  const [from, setFrom] = useState(saved?.from ?? "09:00");
  const [to, setTo] = useState(saved?.to ?? "17:00");
  const [zone, setZone] = useState(() => edit?.timezone ?? myZone());
  const [loadKey, setLoad] = useState<(typeof LOADS)[number]["value"]>(() =>
    edit ? (edit.engagement === "project" ? "project" : (String(edit.hoursPerWeek ?? 40) as "10" | "20" | "40")) : "40",
  );
  const load = LOADS.find((l) => l.value === loadKey)!;
  const [overview, setOverview] = useState(edit?.overview ?? "");
  const [duties, setDuties] = useState<string[]>(() => lines(edit?.responsibilities ?? []));
  const [must, setMust] = useState<string[]>(() => lines(edit?.mustHave ?? []));
  const [nice, setNice] = useState<string[]>(() => lines(edit?.niceToHave ?? []));
  const [important, setImportant] = useState(edit?.important ?? "");
  const [tried, setTried] = useState(false);

  const filled = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  const flexible = days === "Flexible";
  const schedule = flexible ? "Flexible hours" : `${days}, ${ampm(from)} – ${ampm(to)}`;
  const errors = {
    client: !!staff && !edit && !client && "Pick the client this job is for.",
    pay:
      !!posting &&
      !!payMin.trim() &&
      !!payMax.trim() &&
      dollarsToCents(payMin) > dollarsToCents(payMax) &&
      "The lowest pay is above the highest.",
    title: !title.trim() && "Add a title for the role.",
    zone: !zone && "Pick your time zone.",
    time: !flexible && (!from || !to) && "Pick a start and end time.",
    overview: !overview.trim() && "Describe the role in a few sentences.",
    duties: !filled(duties).length && "Add at least one responsibility.",
    must: !filled(must).length && "Add at least one must-have.",
  };
  const invalid = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (tried && errors[k]) || undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) {
      document.querySelector(".vrf [aria-invalid='true'], .vrf .field__error")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const body = {
      role: title.trim(),
      schedule,
      timezone: zone,
      engagement: load.engagement,
      hoursPerWeek: load.hours,
      overview: overview.trim(),
      responsibilities: filled(duties),
      mustHave: filled(must),
      niceToHave: filled(nice),
      important: important.trim(),
    };
    const done = (message: string) => {
      notify(message);
      onSent?.();
      onClose();
    };
    if (edit && !staff) {
      clientEdit.mutate({ id: edit.id, body }, { onSuccess: () => done(`Saved your changes to “${body.role}”.`) });
    } else if (edit) {
      staffEdit.mutate(
        { id: edit.id, body },
        {
          onSuccess: () => {
            const lo = payMin.trim() ? dollarsToCents(payMin) : null;
            const hi = payMax.trim() ? dollarsToCents(payMax) : null;
            const message = `Saved “${body.role}”.${edit.jobPostingId ? " The job post VAs see was updated too." : ""}`;
            if (posting && (lo !== posting.rateMinCents || hi !== posting.rateMaxCents)) {
              savePosting.mutate({ id: posting.id, body: { rateMinCents: lo, rateMaxCents: hi } }, { onSuccess: () => done(message) });
            } else done(message);
          },
        },
      );
    } else if (staff && client) {
      staffCreate.mutate(
        { ...body, contactId: client.id, publish },
        { onSuccess: () => done(publish ? `“${body.role}” is live in every VA’s Open jobs and on ${client.label}’s requests.` : `“${body.role}” was added to ${client.label}’s requests, in review.`) },
      );
    } else {
      request.mutate(body, { onSuccess: () => done("Request sent. GoCWGL will review it and keep you posted here.") });
    }
  };

  return (
    <Modal
      open
      width={680}
      onClose={onClose}
      onSubmit={submit}
      className="vrf-modal"
      titleId="request-va"
      title={edit ? "Edit request" : staff ? "New job posting" : "Request a VA"}
      subtitle={
        edit && !staff
          ? "You can change your request until GoCWGL approves it."
          : edit
          ? `${edit.clientName || "Client"}’s request. Changes show on their VAs page${edit.jobPostingId ? " and in the job post VAs see" : ""}.`
          : staff
          ? "Same form clients use. It’s added to the client’s VA requests, and VAs can apply once it’s live."
          : "Tell us about the role. We’ll review it and match you with a trained VA."
      }
      footer={
        <>
          {edit ? (
            <span className="vrf-foot">Fields marked * are required.</span>
          ) : staff ? (
            <label className="vrf-publish">
              <Toggle checked={publish} onChange={setPublish} label="Publish to Open jobs now" />
              <span>Publish to VA Open jobs now</span>
            </label>
          ) : (
            <span className="vrf-foot">Fields marked * are required.</span>
          )}
          {onFullView && (
            <Button variant="outline" onClick={onFullView}>
              <Icon name="expand" size={13} /> Full view
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : edit ? "Save changes" : staff ? (publish ? "Publish job" : "Save for review") : "Send request"}
          </Button>
        </>
      }
    >
      <div className="vrf">
        <FormError error={mutation.error ?? savePosting.error} />

        {staff && !edit && (
          <Section title="Client" desc="Who this job is for. It’s added to their VA requests in their portal.">
            <ClientPicker value={client} onChange={setClient} error={err("client")} />
          </Section>
        )}

        <Section title="Role" desc="What you’re hiring for.">
          <Field label="Title" htmlFor="vr-title" required error={err("title")}>
            <Input id="vr-title" value={title} maxLength={160} placeholder="e.g. Executive Assistant" aria-invalid={!!err("title")} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="Role overview" htmlFor="vr-overview" required error={err("overview")}>
            <Textarea
              id="vr-overview"
              rows={4}
              maxLength={5000}
              value={overview}
              aria-invalid={!!err("overview")}
              placeholder="What the role is for and what success looks like."
              onChange={(e) => setOverview(e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Schedule" desc="When the VA works, in your time zone.">
          <Field label="Days" required error={err("time")}>
            <div className="vrf-chips" role="radiogroup" aria-label="Days">
              {DAYS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={days === d} className={days === d ? "is-on" : ""} onClick={() => setDays(d)}>
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <div className={`vrf-grid${flexible ? " vrf-grid--1" : ""}`}>
            {!flexible && (
              <>
                <Field label="Start" htmlFor="vr-from">
                  <Input id="vr-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="End" htmlFor="vr-to">
                  <Input id="vr-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </>
            )}
            <Field label="Time zone" htmlFor="vr-zone" required error={err("zone")} className="vrf-grid__wide">
              <Select
                id="vr-zone"
                value={zone}
                aria-invalid={!!err("zone")}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Choose a time zone"
                options={ZONES.some((z) => z.label === zone) || !zone ? ZONES.map((z) => z.label) : [zone, ...ZONES.map((z) => z.label)]}
              />
            </Field>
          </div>
          <Field label="Expected working hours" htmlFor="vr-load" required className="vrf-half">
            <Select id="vr-load" value={loadKey} onChange={(e) => setLoad(e.target.value as typeof loadKey)} options={LOADS.map((l) => ({ value: l.value, label: l.label }))} />
          </Field>
        </Section>

        <Section title="Responsibilities & experience" desc="One item per line. Press Enter to add another.">
          <BulletField label="Key responsibilities" required items={duties} onChange={setDuties} error={err("duties")} placeholder="e.g. Answer and sort the patient inbox" />
          <BulletField label="Must-have experience" required items={must} onChange={setMust} error={err("must")} placeholder="e.g. 2+ years as a virtual assistant" />
          <BulletField label="Good to have experience" items={nice} onChange={setNice} placeholder="e.g. Dental or medical office experience" />
        </Section>

        <Section title="Important" desc="Deal-breakers or anything the VA must know.">
          <Textarea
            id="vr-important"
            aria-label="Important"
            rows={3}
            maxLength={3000}
            value={important}
            placeholder="e.g. Camera on for the daily stand-up, backup internet, fluent English."
            onChange={(e) => setImportant(e.target.value)}
          />
        </Section>

        {posting && (
          <Section title="Pay for the VA" desc="Shown to VAs on the job post. Clients never see it.">
            <div className="vrf-grid vrf-grid--2">
              <Field label="From ($/hr)" htmlFor="vr-pay-min" error={err("pay")}>
                <Input id="vr-pay-min" inputMode="decimal" placeholder="5.00" value={payMin} onChange={(e) => setPayMin(e.target.value)} />
              </Field>
              <Field label="Up to ($/hr)" htmlFor="vr-pay-max">
                <Input id="vr-pay-max" inputMode="decimal" placeholder="8.00" value={payMax} onChange={(e) => setPayMax(e.target.value)} />
              </Field>
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="vrf-section">
      <header className="vrf-section__head">
        <h3>{title}</h3>
        <p>{desc}</p>
      </header>
      <div className="vrf-section__body">{children}</div>
    </section>
  );
}

/** A list of short lines (one per bullet): Enter adds the next line, Backspace on an empty line removes it. */
function BulletField({
  label,
  items,
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  required?: boolean;
  error?: string | false;
}) {
  const list = useRef<HTMLDivElement>(null);
  const focus = (i: number) => requestAnimationFrame(() => list.current?.querySelectorAll("input")[i]?.focus());
  const set = (i: number, v: string) => onChange(items.map((x, k) => (k === i ? v : x)));
  const add = (at: number) => {
    if (items.length >= 20) return;
    onChange([...items.slice(0, at + 1), "", ...items.slice(at + 1)]);
    focus(at + 1);
  };
  const remove = (i: number) => {
    onChange(items.length === 1 ? [""] : items.filter((_, k) => k !== i));
    focus(Math.max(0, i - 1));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(i);
    } else if (e.key === "Backspace" && !items[i] && items.length > 1) {
      e.preventDefault();
      remove(i);
    }
  };

  return (
    <Field label={label} required={required} error={error || undefined}>
      <div className="bullet-field" ref={list}>
        {items.map((x, i) => (
          <div key={i} className="bullet-field__row">
            <span className="bullet-field__dot" aria-hidden="true" />
            <Input
              value={x}
              maxLength={300}
              aria-label={`${label} ${i + 1}`}
              aria-invalid={!!error && i === 0}
              placeholder={i === 0 ? placeholder : "Add another…"}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => onKey(e, i)}
            />
            {(items.length > 1 || x) && (
              <button type="button" className="bullet-field__remove" aria-label={`Remove line ${i + 1}`} onClick={() => remove(i)}>
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
        ))}
        {items.length < 20 && (
          <button type="button" className="bullet-field__add" onClick={() => add(items.length - 1)}>
            <Icon name="plus" size={12} /> Add line
          </button>
        )}
      </div>
    </Field>
  );
}

/** Staff only: search the CRM and pick the client a job is for. */
function ClientPicker({
  value,
  onChange,
  error,
}: {
  value: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
  error?: string | false;
}) {
  const [q, setQ] = useState("");
  const results = useContactsPage({ q: q.trim(), limit: 6 });
  const items = results.data?.items ?? [];
  const label = (c: { company: string; name: string; email: string }) => c.company || c.name || c.email;

  if (value) {
    return (
      <div className="vrf-client is-picked">
        <Avatar name={value.label} tone={avatarTone(value.id)} size="sm" />
        <strong className="u-grow">{value.label}</strong>
        <button type="button" className="bullet-field__add" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }
  return (
    <Field label="Client" required error={error || undefined}>
      <div className="vrf-client">
        <SearchBox label="Search clients" placeholder="Search by name, company or email" value={q} onChange={setQ} />
        <ul className="vrf-client__list">
          {items.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onChange({ id: c.id, label: label(c) })}>
                <Avatar name={label(c)} tone={avatarTone(c.id)} size="sm" />
                <span className="stack stack--0 u-grow">
                  <strong>{label(c)}</strong>
                  <span className="text-tiny">{[c.company ? c.name : "", c.email].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-tiny">{c.stage}</span>
              </button>
            </li>
          ))}
          {results.isSuccess && !items.length && <li className="vrf-client__empty">No clients match.</li>}
        </ul>
      </div>
    </Field>
  );
}
