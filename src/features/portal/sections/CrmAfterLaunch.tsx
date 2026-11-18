"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, ConfirmDialog, Field, FormError, Icon, Input, LoadState, Select, Textarea } from "@/components/ui";
import { CRM_CARE_PLAN, CRM_FEATURE_FROM_CENTS, PRIORITIES } from "@/data/portal";
import type { ProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useCompletePortalBuild, usePortalBuilds } from "@/utils/hooks/useDelivery";
import { useCreatePortalTicket, usePortalTickets } from "@/utils/hooks/useSupport";
import { usePortal } from "../state/PortalContext";
import { TICKET_TONES, TicketThread } from "./SupportSection";

/** Revisions and feature requests are support tickets marked with this area, so they list here and in Support. */
const CRM_AREA = "CRM";

/** The parts of a CRM a revision can be about. */
const CRM_PARTS = [
  "Contacts and companies",
  "Pipelines and deals",
  "Automations",
  "Emails and campaigns",
  "Calendar and bookings",
  "Forms and surveys",
  "Invoices and payments",
  "Client portal",
  "Reports and dashboards",
  "Team logins and permissions",
  "Something else",
];

/** The client's CRM builds that are launched (or complete). */
function useLaunchedCrms(): ProjectOut[] {
  return (usePortalBuilds().data ?? []).filter((b) => b.kind === "crm" && (b.status === "Launched" || b.completed));
}

/** Whether any CRM build is launched: Revisions and New features open then. */
export function useCrmLaunched(): boolean {
  return useLaunchedCrms().length > 0;
}

/** Whether a launched CRM is complete (marked by both the client and the team): new features are priced from then. */
function useCrmComplete(): boolean {
  return useLaunchedCrms().some((b) => b.completed);
}

// ----------------------------------------------------------------------------------- Marking the build complete

/**
 * A launched CRM build the client and the team each mark complete. Shows who has confirmed, and lets the client
 * confirm theirs once they've checked everything works.
 */
export function CrmCompletionCards() {
  const builds = useLaunchedCrms().filter((b) => !b.completed);
  if (!builds.length) return null;
  return (
    <>
      {builds.map((b) => (
        <CompletionCard key={b.id} build={b} />
      ))}
    </>
  );
}

function CompletionCard({ build: b }: { build: ProjectOut }) {
  const { readOnly, update } = usePortal();
  const complete = useCompletePortalBuild();
  const [confirming, setConfirming] = useState(false);
  const steps = [
    { who: "You", at: b.clientCompletedAt, todo: "Check that everything works as agreed" },
    { who: "GoCWGL", at: b.teamCompletedAt, todo: "Your team confirms the build is finished" },
  ];

  return (
    <section className="crm-complete">
      <div className="crm-complete__copy">
        <span className="crm-block__kicker">Your CRM is live</span>
        <h2 className="crm-complete__title">Mark {b.package} complete</h2>
        <p className="crm-complete__text">
          Your CRM is launched. Once you’ve tested it and it works the way we agreed, mark it complete. When you and your GoCWGL
          team have both marked it, the build is finished: changes to what’s built are then revisions (unlimited with the Care
          plan), and anything new is a new feature, from {formatCents(CRM_FEATURE_FROM_CENTS)}.
        </p>
      </div>
      <div className="crm-complete__steps">
        {steps.map((s) => (
          <div className={`crm-complete__step${s.at ? " is-done" : ""}`} key={s.who}>
            <span className="crm-complete__dot">{s.at ? <Icon name="check" size={13} strokeWidth={3} /> : null}</span>
            <span className="stack stack--2">
              <span className="text-strong">{s.who}</span>
              <span className="text-small">{s.at ? `Marked complete ${formatShort(s.at)}` : s.todo}</span>
            </span>
          </div>
        ))}
        {!readOnly && !b.clientCompletedAt && (
          <Button variant="primary" onClick={() => setConfirming(true)}>
            <Icon name="check" strokeWidth={2.6} />
            Mark complete
          </Button>
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title="Mark your CRM complete?"
          confirmLabel="Yes, it’s complete"
          icon="check"
          pending={complete.isPending}
          error={complete.error}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            complete.mutate(b.id, {
              onSuccess: () => {
                setConfirming(false);
                update({ toast: "Thanks! You’ve marked your CRM complete." });
              },
            })
          }
        >
          You’re confirming {b.package} works the way we agreed. You can’t undo this yourself. After it’s complete, ask for changes
          under Revisions and new things under New features.
        </ConfirmDialog>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------- Shared pieces

/** A section's explainer: what it is, examples, and what to send. */
function Explainer({
  kicker,
  title,
  lead,
  examples,
  needs,
  aside,
}: {
  kicker: string;
  title: string;
  lead: string;
  examples: string[];
  needs: string[];
  aside: React.ReactNode;
}) {
  return (
    <section className="crm-after">
      <header className="crm-block__head">
        <span className="crm-block__kicker">{kicker}</span>
        <h2 className="crm-block__title">{title}</h2>
        <p className="crm-block__lead">{lead}</p>
      </header>
      <div className="crm-after__grid">
        <div className="crm-after__card">
          <span className="crm-plan__covers-title">For example</span>
          <ul className="crm-after__list">
            {examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <div className="crm-after__card">
          <span className="crm-plan__covers-title">What we need from you</span>
          <ol className="crm-after__needs">
            {needs.map((n, i) => (
              <li key={n}>
                <span className="crm-after__num">{i + 1}</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="crm-after__card crm-after__card--price">{aside}</div>
      </div>
    </section>
  );
}

/** The client's CRM requests of one type (revisions or new features), each opening its thread. */
function RequestList({ type, empty }: { type: "change" | "feature"; empty: string }) {
  const { readOnly } = usePortal();
  const query = usePortalTickets();
  const tickets = (query.data ?? []).filter((t) => t.type === type && t.area === CRM_AREA);
  const [openId, setOpenId] = useState("");

  return (
    <section className="card support-tickets">
      <span className="kicker">YOUR {type === "change" ? "REVISIONS" : "FEATURE REQUESTS"}</span>
      <LoadState query={query} inline isEmpty={!tickets.length} empty={empty}>
        <div>
          {tickets.map((t) => (
            <div key={t.id}>
              <button type="button" className="list-row cell-button" aria-expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? "" : t.id)}>
                <span className="ticket-code">{t.code}</span>
                <span className="stack stack--2 u-grow">
                  <span className="text-strong">{t.title}</span>
                  <span className="text-small">
                    {formatShort(t.createdAt)} · {t.priority}
                  </span>
                </span>
                <Badge tone={TICKET_TONES[t.status] ?? "cyan"} dot>
                  {t.status}
                </Badge>
              </button>
              {openId === t.id && <TicketThread ticket={t} readOnly={readOnly} />}
            </div>
          ))}
        </div>
      </LoadState>
    </section>
  );
}

/** Joins the form's answers into the request's details, one labelled block each (empty ones left out). */
const details = (parts: Array<[string, string]>) =>
  parts
    .filter(([, v]) => v.trim())
    .map(([label, v]) => `${label}:\n${v.trim()}`)
    .join("\n\n");

// ---------------------------------------------------------------------------------------------- Revisions

/** Revisions: changes to what's already in the client's CRM, unlimited with the Care plan. */
export function CrmRevisions() {
  const { readOnly, update } = usePortal();
  const create = useCreatePortalTicket();
  const [form, setForm] = useState({ title: "", part: CRM_PARTS[0], now: "", want: "", links: "", priority: "Medium" });
  const [error, setError] = useState("");
  const set = (p: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...p }));
    setError("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.want.trim()) {
      setError("Add a short summary and what it should do instead.");
      return;
    }
    create.mutate(
      {
        type: "change",
        area: CRM_AREA,
        title: form.title.trim(),
        priority: form.priority as (typeof PRIORITIES)[number]["value"],
        description: details([
          ["Part of the CRM", form.part],
          ["What it does now", form.now],
          ["What it should do", form.want],
          ["Links or screenshots", form.links],
        ]),
      },
      {
        onSuccess: (t) => {
          setForm((f) => ({ ...f, title: "", now: "", want: "", links: "" }));
          update({ toast: `${t.code} sent. Your GoCWGL team will pick up the revision.` });
        },
      },
    );
  };

  return (
    <div className="page-stack">
      <CrmCompletionCards />
      <Explainer
        kicker="Revisions"
        title="Change something that’s already in your CRM"
        lead="A revision adjusts what we built: wording, fields, layout, steps or timing. It doesn’t add something new; for that, use New features."
        examples={[
          "Rename a pipeline stage or add a field to contacts",
          "Change when a follow-up email or reminder goes out",
          "Move, hide or reorder things on a screen",
          "Fix something that doesn’t work the way we agreed",
        ]}
        needs={[
          "Which part of the CRM it’s about",
          "What it does now",
          "What it should do instead",
          "A screenshot or link, if you have one",
          "How soon you need it",
        ]}
        aside={
          <>
            <span className="crm-plan__covers-title">Care plan</span>
            <span className="crm-after__price">
              {formatCents(CRM_CARE_PLAN.priceCents)}
              <small>/year</small>
            </span>
            <ul className="crm-after__list">
              {CRM_CARE_PLAN.includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <span className="text-small">Your first year after launch is free. After that, it’s {formatCents(CRM_CARE_PLAN.priceCents)} a year, and revisions stay unlimited while it’s active.</span>
          </>
        }
      />

      <div className="card-row">
        {!readOnly && (
          <form className="card card--glow support-form" onSubmit={submit}>
            <span className="kicker">NEW REVISION</span>
            <Field label="Short summary" htmlFor="rv-title">
              <Input id="rv-title" value={form.title} placeholder="e.g. Add a “Lost reason” field to deals" onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Which part of your CRM?" htmlFor="rv-part">
              <Select id="rv-part" value={form.part} options={CRM_PARTS} onChange={(e) => set({ part: e.target.value })} />
            </Field>
            <Field label="What it does now" htmlFor="rv-now">
              <Textarea id="rv-now" rows={3} value={form.now} placeholder="e.g. When a deal is lost, there’s nowhere to say why." onChange={(e) => set({ now: e.target.value })} />
            </Field>
            <Field label="What it should do instead" htmlFor="rv-want">
              <Textarea
                id="rv-want"
                rows={4}
                value={form.want}
                placeholder="e.g. Ask for a reason (price, timing, went elsewhere) when a deal moves to Lost, and show it on the deal."
                onChange={(e) => set({ want: e.target.value })}
              />
            </Field>
            <Field label="Links or screenshots (optional)" htmlFor="rv-links">
              <Input id="rv-links" value={form.links} placeholder="Paste a link to a screenshot, Loom video or page" onChange={(e) => set({ links: e.target.value })} />
            </Field>
            <Field label="How urgent?" htmlFor="rv-pri">
              <Select id="rv-pri" value={form.priority} options={PRIORITIES} onChange={(e) => set({ priority: e.target.value })} />
            </Field>
            {error && (
              <p className="text-error" role="alert">
                {error}
              </p>
            )}
            <FormError error={create.error} />
            <Button type="submit" variant="primary" className="u-self-end" disabled={create.isPending}>
              {create.isPending ? "Sending…" : "Send revision"}
            </Button>
          </form>
        )}
        <RequestList type="change" empty="No revisions yet." />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- New features

/** New features: something the CRM doesn't do yet, quoted from $100 once the CRM is complete. */
export function CrmFeatures() {
  const { readOnly, update } = usePortal();
  const complete = useCrmComplete();
  const create = useCreatePortalTicket();
  const [form, setForm] = useState({ title: "", goal: "", how: "", who: "", tools: "", when: "" });
  const [error, setError] = useState("");
  const set = (p: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...p }));
    setError("");
  };
  const from = formatCents(CRM_FEATURE_FROM_CENTS);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.goal.trim() || !form.how.trim()) {
      setError("Add the feature’s name, the problem it solves and how it should work.");
      return;
    }
    create.mutate(
      {
        type: "feature",
        area: CRM_AREA,
        title: form.title.trim(),
        description: details([
          ["Problem it solves", form.goal],
          ["How it should work", form.how],
          ["Who uses it", form.who],
          ["Tools to connect or examples", form.tools],
          ["Needed by", form.when],
        ]),
      },
      {
        onSuccess: (t) => {
          setForm({ title: "", goal: "", how: "", who: "", tools: "", when: "" });
          update({ toast: `${t.code} sent. Your GoCWGL team will send you a quote.` });
        },
      },
    );
  };

  return (
    <div className="page-stack">
      <CrmCompletionCards />
      <Explainer
        kicker="New features"
        title="Add something your CRM doesn’t do yet"
        lead="A new feature is new code: a menu, record type, integration, report or automation that isn’t in your CRM today. Tell us what you need and we’ll quote it before any work starts."
        examples={[
          "A new menu, such as Jobs, Properties or Orders",
          "Connect your accounting, payments or another tool",
          "A new report or dashboard",
          "A new automation or AI helper",
        ]}
        needs={[
          "The problem it solves, or the goal",
          "How it should work, step by step",
          "Who will use it (you, your team, your clients)",
          "Tools it connects to, or examples you like",
          "When you need it by",
        ]}
        aside={
          <>
            <span className="crm-plan__covers-title">Pricing</span>
            <span className="crm-after__price">
              from {from}
              <small>/feature</small>
            </span>
            <span className="text-small">
              The price depends on how complex the code is. You get a quote to approve first; nothing is billed until you do.
            </span>
            <span className={`crm-after__status${complete ? " is-done" : ""}`}>
              <Icon name={complete ? "check" : "clock"} size={13} strokeWidth={2.6} />
              {complete
                ? `Your CRM is complete: features start at ${from}.`
                : `Feature pricing from ${from} starts once you and GoCWGL both mark your CRM complete.`}
            </span>
          </>
        }
      />

      <div className="card-row">
        {!readOnly && (
          <form className="card card--glow support-form" onSubmit={submit}>
            <span className="kicker">NEW FEATURE REQUEST</span>
            <Field label="Feature name" htmlFor="ft-title">
              <Input id="ft-title" value={form.title} placeholder="e.g. Job scheduling for my field team" onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="What problem does it solve?" htmlFor="ft-goal">
              <Textarea
                id="ft-goal"
                rows={3}
                value={form.goal}
                placeholder="e.g. We book jobs in a spreadsheet and double-book technicians."
                onChange={(e) => set({ goal: e.target.value })}
              />
            </Field>
            <Field label="How should it work?" htmlFor="ft-how">
              <Textarea
                id="ft-how"
                rows={5}
                value={form.how}
                placeholder={"Step by step, e.g.\n1. Create a job from a won deal\n2. Pick a technician and a time\n3. The technician gets a text with the address"}
                onChange={(e) => set({ how: e.target.value })}
              />
            </Field>
            <Field label="Who will use it? (optional)" htmlFor="ft-who">
              <Input id="ft-who" value={form.who} placeholder="e.g. Office staff and 6 technicians" onChange={(e) => set({ who: e.target.value })} />
            </Field>
            <Field label="Tools to connect, or examples you like (optional)" htmlFor="ft-tools">
              <Input id="ft-tools" value={form.tools} placeholder="e.g. QuickBooks, Google Calendar, or a link to an app you like" onChange={(e) => set({ tools: e.target.value })} />
            </Field>
            <Field label="Needed by (optional)" htmlFor="ft-when">
              <Input id="ft-when" value={form.when} placeholder="e.g. Before our busy season in March" onChange={(e) => set({ when: e.target.value })} />
            </Field>
            {error && (
              <p className="text-error" role="alert">
                {error}
              </p>
            )}
            <FormError error={create.error} />
            <Button type="submit" variant="primary" className="u-self-end" disabled={create.isPending}>
              {create.isPending ? "Sending…" : "Request a quote"}
            </Button>
          </form>
        )}
        <RequestList type="feature" empty="No feature requests yet." />
      </div>
    </div>
  );
}
