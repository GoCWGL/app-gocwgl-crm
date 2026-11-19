"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Avatar, Button, Checkbox, Field, FormError, Icon, Input, Modal, SearchBox, Select, Textarea, Toggle } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { useContactsPage } from "@/utils/hooks/useContacts";
import type { JobPostingOut, VaRequestIn, VaRequestOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents } from "@/utils/format/money";
import { useUpdateJobPosting } from "@/utils/hooks/useJobPostings";
import { useRequestVa, useStaffCreateVaRequest, useStaffUpdateVaRequest, useUpdateMyVaRequest, useVaRequests } from "@/utils/hooks/useClientWork";
import { usePortal } from "../state/PortalContext";
import { ClientVaAgreementTerms } from "./ClientVaAgreement";
import {
  TRAINING_FEE_SHORT,
  VA_MAINTENANCE_FEE_DOLLARS,
  VA_TRAINING_FEE_DOLLARS_PER_HOUR,
  VA_TRAINING_MONTHS,
  maintenanceFeeLabel,
  type VaRequestWithAgreementIn,
} from "../lib/vaAgreement";

type Engagement = NonNullable<VaRequestIn["engagement"]>;

type Hours = 10 | 20 | 40;

/** Expected working hours: set weekly hours (each with its maintenance fee) or an open project (no maintenance fee; GoCWGL quotes the payment). */
const LOADS = [
  { value: "10", label: "10 hours a week", engagement: "part_time", hours: 10 },
  { value: "20", label: "20 hours a week", engagement: "part_time", hours: 20 },
  { value: "40", label: "40 hours a week", engagement: "full_time", hours: 40 },
  { value: "project", label: "Open project", engagement: "project", hours: null },
] as const satisfies ReadonlyArray<{ value: string; label: string; engagement: Engagement; hours: Hours | null }>;
type LoadKey = (typeof LOADS)[number]["value"];
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
export function VaRequestModal({ onClose, onSent, project }: { onClose: () => void; onSent?: () => void; project?: boolean }) {
  const { notify } = usePortal();
  const pastVas = usePastVas();
  return <VaRequestForm onClose={onClose} onSent={onSent} notify={notify} pastVas={pastVas} startAsProject={project} />;
}

/** A VA who worked with the client before (matched to one of their requests): one they can ask for on a project. */
export type PastVa = { id: string; name: string };

/** Client portal: the VAs matched to the client's requests, now or before (by name only). */
export function usePastVas(): PastVa[] {
  const requests = useVaRequests().data ?? [];
  const byId = new Map<string, string>();
  for (const r of requests) if (r.matchedVa) byId.set(r.matchedVa.id, r.matchedVa.name);
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
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
  pastVas = [],
  startAsProject,
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
  /** Client: VAs who worked with them before, to ask for one on an open project (otherwise any VA). */
  pastVas?: PastVa[];
  /** A new request that starts on Open project (VA › Projects). */
  startAsProject?: boolean;
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
  const savedLoad: LoadKey = edit ? (edit.engagement === "project" ? "project" : (String(edit.hoursPerWeek ?? 40) as "10" | "20" | "40")) : "40";
  const [loadKey, setLoad] = useState<LoadKey>(startAsProject && !edit ? "project" : savedLoad);
  const load = LOADS.find((l) => l.value === loadKey)!;
  // Clients accept the VA agreement (the monthly maintenance fee for the hours) before the form: first thing for a
  // new request, and again when they change the hours on one. Staff don't.
  const [step, setStep] = useState<"agreement" | "form">(!staff && !edit ? "agreement" : "form");
  const [agreed, setAgreed] = useState(false);
  const [agreeTried, setAgreeTried] = useState(false);
  // What to go back to if they leave the agreement without accepting it (editing).
  const [before, setBefore] = useState<{ load: LoadKey; agreed: boolean }>({ load: savedLoad, agreed: false });
  const openAgreement = () => {
    setBefore({ load: loadKey, agreed });
    setAgreed(false);
    setAgreeTried(false);
    setStep("agreement");
  };
  const acceptAgreement = (e: FormEvent) => {
    e.preventDefault();
    setAgreeTried(true);
    if (agreed) setStep("form");
  };
  const [overview, setOverview] = useState(edit?.overview ?? "");
  const [duties, setDuties] = useState<string[]>(() => lines(edit?.responsibilities ?? []));
  const [must, setMust] = useState<string[]>(() => lines(edit?.mustHave ?? []));
  const [nice, setNice] = useState<string[]>(() => lines(edit?.niceToHave ?? []));
  const [important, setImportant] = useState(edit?.important ?? "");
  // An open project: the client's estimated budget and due date (GoCWGL quotes the payment).
  const [budget, setBudget] = useState(edit?.budgetCents != null ? centsToDollars(edit.budgetCents) : "");
  const [due, setDue] = useState(edit?.dueDate ?? "");
  const project = load.engagement === "project";
  // An open project: the VA the client wants ("" = any VA, GoCWGL picks). Admin assigns them, or another VA.
  const [vaId, setVaId] = useState(edit?.requestedVa?.id ?? "");
  const vaChoices = edit?.requestedVa && !pastVas.some((v) => v.id === edit.requestedVa!.id) ? [edit.requestedVa, ...pastVas] : pastVas;
  // Whether the VA uses the time tracker and clocks in and out (Attendance). Off by default on a new request; the
  // client's Time & activity menu only shows once a request turns one on.
  const [timeTracker, setTimeTracker] = useState(edit?.wantsTimeTracker ?? false);
  const [attendance, setAttendance] = useState(edit?.wantsAttendance ?? false);
  const [tried, setTried] = useState(false);

  const filled = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  const flexible = days === "Flexible";
  const schedule = flexible ? "Flexible hours" : `${days}, ${ampm(from)} – ${ampm(to)}`;
  const errors = {
    client: !!staff && !edit && !client && "Pick the client this job is for.",
    budget: project && !(dollarsToCents(budget) > 0) && "Add your estimated budget.",
    due: project && !due && "Pick when the project is due.",
    pay:
      !!posting &&
      !!payMin.trim() &&
      !!payMax.trim() &&
      dollarsToCents(payMin) > dollarsToCents(payMax) &&
      "The lowest pay is above the highest.",
    title: !title.trim() && (project ? "Say what the project is." : "Add a title for the role."),
    zone: !project && !zone && "Pick your time zone.",
    time: !project && !flexible && (!from || !to) && "Pick a start and end time.",
    overview: !overview.trim() && (project ? "Describe the project." : "Describe the role in a few sentences."),
    duties: !project && !filled(duties).length && "Add at least one responsibility.",
    must: !project && !filled(must).length && "Add at least one must-have.",
  };
  const invalid = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (tried && errors[k]) || undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // A client's new request, or new hours on one, needs the agreement first.
    if (!staff && !agreed && (!edit || loadKey !== savedLoad)) {
      openAgreement();
      return;
    }
    setTried(true);
    if (invalid) {
      document.querySelector(".vrf [aria-invalid='true'], .vrf .field__error")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const body: VaRequestWithAgreementIn = {
      ...(!staff && agreed && { agreementAccepted: true }),
      role: title.trim(),
      engagement: load.engagement,
      hoursPerWeek: load.hours,
      overview: overview.trim(),
      important: important.trim(),
      ...(project
        ? // A project has no working hours, lists or time tracking: just its budget and due date.
          {
            schedule: "",
            timezone: "",
            responsibilities: [],
            mustHave: [],
            niceToHave: [],
            wantsTimeTracker: false,
            wantsAttendance: false,
            budgetCents: dollarsToCents(budget),
            dueDate: due,
            requestedVaId: vaId || null,
          }
        : {
            schedule,
            timezone: zone,
            responsibilities: filled(duties),
            mustHave: filled(must),
            niceToHave: filled(nice),
            wantsTimeTracker: timeTracker,
            wantsAttendance: attendance,
            budgetCents: null,
            dueDate: null,
          }),
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

  if (step === "agreement") {
    return (
      <Modal
        open
        width={680}
        onClose={onClose}
        onSubmit={acceptAgreement}
        className="vrf-modal"
        titleId="request-va"
        title={edit ? "Change the hours" : "Request a VA"}
        subtitle={
          edit
            ? "The maintenance fee depends on the hours, so accept the VA agreement for the new hours."
            : "Step 1 of 2 · Choose the hours or an open project and accept the agreement. Then tell us about it."
        }
        footer={
          <>
            <span className="u-spacer" />
            {edit ? (
              <Button
                onClick={() => {
                  setLoad(before.load);
                  setAgreed(before.agreed);
                  setStep("form");
                }}
              >
                Back
              </Button>
            ) : (
              <Button onClick={onClose}>Cancel</Button>
            )}
            <Button type="submit" variant="primary">
              Accept and continue <Icon name="arrowRight" size={14} />
            </Button>
          </>
        }
      >
        <VaAgreement
          loadKey={loadKey}
          onLoad={setLoad}
          agreed={agreed}
          onAgree={setAgreed}
          error={agreeTried && !agreed ? "Tick the box to accept the VA agreement before you continue." : undefined}
        />
      </Modal>
    );
  }

  // Set hours or an open project. Staff pick it here; clients set it on the agreement step, so changing it means
  // accepting the agreement again.
  const hoursField = staff ? (
    <Field label="Expected working hours" htmlFor="vr-load" required className="vrf-half">
      <Select id="vr-load" value={loadKey} onChange={(e) => setLoad(e.target.value as typeof loadKey)} options={LOADS.map((l) => ({ value: l.value, label: l.label }))} />
    </Field>
  ) : (
    <Field label={project ? "Request type" : "Expected working hours"} required>
      <div className="vra-summary">
        <Icon name={project ? "briefcase" : "clock"} size={16} className="vra-summary__icon" />
        <span className="vra-summary__text">
          <strong>{load.label}</strong>
          <span>
            {project ? "No maintenance fee · payment quoted by GoCWGL" : `Maintenance fee: ${maintenanceFeeLabel(load.hours)} ${TRAINING_FEE_SHORT}`}
            {agreed && ` · ${project ? "project agreement" : "VA agreement"} accepted`}
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={openAgreement}>
          Change
        </Button>
      </div>
    </Field>
  );

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
          : project
          ? "Step 2 of 2 · Tell us about the project. We’ll review it and quote the payment."
          : "Step 2 of 2 · Tell us about the role. We’ll review it and match you with a trained VA."
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

        <Section title={project ? "Project" : "Role"} desc={project ? "What you need done, your budget and when it’s due." : "What you’re hiring for."}>
          <Field label={project ? "What project" : "Title"} htmlFor="vr-title" required error={err("title")}>
            <Input
              id="vr-title"
              value={title}
              maxLength={160}
              placeholder={project ? "e.g. Rebuild our booking website" : "e.g. Executive Assistant"}
              aria-invalid={!!err("title")}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label={project ? "Details" : "Role overview"} htmlFor="vr-overview" required error={err("overview")}>
            <Textarea
              id="vr-overview"
              rows={project ? 5 : 4}
              maxLength={5000}
              value={overview}
              aria-invalid={!!err("overview")}
              placeholder={project ? "What the project involves, what you have already, and what done looks like." : "What the role is for and what success looks like."}
              onChange={(e) => setOverview(e.target.value)}
            />
          </Field>
          {project && (
            <div className="vrf-grid vrf-grid--2">
              <Field label="Estimated budget ($)" htmlFor="vr-budget" required error={err("budget")} hint="GoCWGL quotes the payment after review.">
                <Input id="vr-budget" inputMode="decimal" placeholder="500" value={budget} aria-invalid={!!err("budget")} onChange={(e) => setBudget(e.target.value)} />
              </Field>
              <Field label="Due date" htmlFor="vr-due" required error={err("due")}>
                <Input id="vr-due" type="date" value={due} aria-invalid={!!err("due")} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
          )}
          {project && !staff && vaChoices.length > 0 && (
            <Field label="VA for this project" htmlFor="vr-va" hint="Ask for a VA who worked with you before, or let GoCWGL pick. We assign the VA once the project is approved.">
              <Select
                id="vr-va"
                value={vaId}
                onChange={(e) => setVaId(e.target.value)}
                options={[{ value: "", label: "Any VA · GoCWGL picks the right person" }, ...vaChoices.map((v) => ({ value: v.id, label: `${v.name} · worked with you before` }))]}
              />
            </Field>
          )}
          {project && hoursField}
        </Section>

        {!project && (
          <>
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
              {hoursField}
            </Section>

            <Section title="Time tracking" desc="Off unless you need it. Turn on what you want and it’s added to your menu (Time & activity) and your VA’s.">
              <ToolRow
                icon="clock"
                title="Time tracker"
                hint="Your VA tracks the time they spend on your work. You see it in VA tracker."
                checked={timeTracker}
                onChange={setTimeTracker}
              />
              <ToolRow
                icon="calendarCheck"
                title="Attendance"
                hint="Your VA clocks in and out, so you see when they start and whether it’s on time for your schedule."
                checked={attendance}
                onChange={setAttendance}
              />
            </Section>

            <Section title="Responsibilities & experience" desc="One item per line. Press Enter to add another.">
              <BulletField label="Key responsibilities" required items={duties} onChange={setDuties} error={err("duties")} placeholder="e.g. Answer and sort the patient inbox" />
              <BulletField label="Must-have experience" required items={must} onChange={setMust} error={err("must")} placeholder="e.g. 2+ years as a virtual assistant" />
              <BulletField label="Good to have experience" items={nice} onChange={setNice} placeholder="e.g. Dental or medical office experience" />
            </Section>
          </>
        )}

        <Section title="Important" desc={project ? "Must-haves, tools, access or anything the VA must know." : "Deal-breakers or anything the VA must know."}>
          <Textarea
            id="vr-important"
            aria-label="Important"
            rows={3}
            maxLength={3000}
            value={important}
            placeholder={project ? "e.g. Keep our current links, use our brand colors, test on mobile." : "e.g. Camera on for the daily stand-up, backup internet, fluent English."}
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

/** Step 1 of Request a VA: pick the hours, read the VA agreement (the monthly maintenance fee) and accept it. */
function VaAgreement({
  loadKey,
  onLoad,
  agreed,
  onAgree,
  error,
}: {
  loadKey: LoadKey;
  onLoad: (key: LoadKey) => void;
  agreed: boolean;
  onAgree: (agreed: boolean) => void;
  error?: string;
}) {
  const load = LOADS.find((l) => l.value === loadKey) ?? LOADS[2];
  return (
    <div className="vrf">
      <Section title="Hours a week" desc="How much your VA works for you, or a one-off open project. Set hours have a monthly maintenance fee (your VA’s pay is separate).">
        <div className="vra-hours" role="radiogroup" aria-label="Hours a week">
          {LOADS.map((l) => (
            <button key={l.value} type="button" role="radio" aria-checked={l.value === loadKey} className={l.value === loadKey ? "is-on" : ""} onClick={() => onLoad(l.value)}>
              <span className="vra-hours__label">{l.label}</span>
              <span className="vra-hours__fee">{l.hours ? `$${VA_MAINTENANCE_FEE_DOLLARS[l.hours]} / month fee` : "No maintenance fee"}</span>
            </button>
          ))}
        </div>
      </Section>

      {!load.hours ? (
        <Section title="Project agreement" desc="Please read it before you request a project.">
          <div className="vra-doc" tabIndex={0} aria-label="Project agreement">
            <h4>No maintenance fee</h4>
            <p>
              An open project is one piece of work with a due date, not set weekly hours, so there’s <strong>no monthly maintenance
              fee</strong>.
            </p>
            <h4>The payment is quoted by GoCWGL</h4>
            <p>
              Tell us what the project is, its details, your estimated budget and when it’s due. GoCWGL reviews it and sends you a
              quote for the payment. Your budget helps us scope the work; the quote is the price. Once you agree to it, GoCWGL
              sends you the invoice, and assigns your VA as soon as it’s paid.
            </p>
            <h4>When to pay</h4>
            <p>
              Pay each project invoice <strong>within 3 business days of the invoice date</strong>. You’ll find them in the Invoices menu.
            </p>
            <h4>Changing to set hours</h4>
            <p>If you change your request to set weekly hours, the VA agreement and its monthly maintenance fee apply, and you’ll be asked to accept it.</p>
          </div>
          <Field error={error}>
            <Checkbox
              brand
              checked={agreed}
              aria-invalid={!!error}
              onChange={(e) => onAgree(e.target.checked)}
              label={
                <>
                  I’ve read the project agreement. I understand there’s <strong>no maintenance fee</strong>, that GoCWGL quotes the payment
                  for the project, and that I pay each invoice within 3 business days of its date.
                </>
              }
            />
          </Field>
        </Section>
      ) : (
          <Section title="VA agreement" desc="Please read it before you request a VA.">
            <ClientVaAgreementTerms hours={load.hours} />
            <Field error={error}>
              <Checkbox
                brand
                checked={agreed}
                aria-invalid={!!error}
                onChange={(e) => onAgree(e.target.checked)}
                label={
                  <>
                    I’ve read the VA agreement and agree to the <strong>${VA_MAINTENANCE_FEE_DOLLARS[load.hours]} monthly maintenance fee</strong> for{" "}
                    {load.hours} hours a week, plus <strong>${VA_TRAINING_FEE_DOLLARS_PER_HOUR} for each hour my VA works</strong> in the first{" "}
                    {VA_TRAINING_MONTHS} months (taken off my VA’s invoice). I understand it doesn’t include my VA’s salary, which I pay directly to my VA’s payment method, and that I pay each invoice within 3 business days of its date.
                  </>
                }
              />
            </Field>
          </Section>
      )}
    </div>
  );
}

/** One yes/no choice on the request (time tracker, Attendance). */
function ToolRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: "clock" | "calendarCheck";
  title: string;
  hint: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className={`vrf-tool${checked ? " is-on" : ""}`}>
      <Icon name={icon} size={16} className="vrf-tool__icon" />
      <span className="vrf-tool__text">
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
      <span className="vrf-tool__state">{checked ? "Yes" : "No"}</span>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
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
