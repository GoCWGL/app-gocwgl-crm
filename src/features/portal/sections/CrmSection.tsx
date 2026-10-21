"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, Field, FormError, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import {
  CRM_ADDONS,
  CRM_FAQ,
  CRM_PACKAGES,
  CRM_REQUEST_PREFIX,
  CRM_STEPS,
  CRM_TEAM_SIZES,
  type CrmPackageKey,
} from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useCreatePortalTicket, usePortalTickets } from "@/utils/hooks/useSupport";
import { usePortal } from "../state/PortalContext";

const PACKAGE_KEYS = Object.keys(CRM_PACKAGES) as CrmPackageKey[];
const STATUS_TONES: Record<string, Tone> = { New: "cyan", "In progress": "brand", "Waiting on client": "amber", Answered: "purple", Done: "green" };

/** CRM builds: the two packages, how it works, and a request form (sent to the team as a support request). */
export function CrmSection() {
  const { readOnly, goTo } = usePortal();
  const [requesting, setRequesting] = useState<CrmPackageKey | null>(null);
  const requests = (usePortalTickets().data ?? []).filter((t) => t.title.startsWith(CRM_REQUEST_PREFIX));

  return (
    <div className="page-stack">
      <section className="crm-hero">
        <IconTile size="xl" tone="purple">
          <Icon name="users" size={22} />
        </IconTile>
        <div className="stack stack--4 u-grow">
          <span className="kicker">CRM BUILDS</span>
          <h2 className="crm-hero__title">A CRM built around how you sell</h2>
          <span className="text-muted">
            Your contacts, pipeline, emails and bookings in one place, built by the same team as your funnels, so every lead lands where it should.
          </span>
        </div>
      </section>

      {requests.length > 0 && (
        <section className="card stack stack--8">
          <h2 className="card-title">Your CRM requests</h2>
          {requests.map((t) => (
            <div className="inset crm-request" key={t.id}>
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{t.title.replace(`${CRM_REQUEST_PREFIX}: `, "")}</span>
                <span className="text-small">
                  {t.code} · Sent {formatShort(t.createdAt)}
                </span>
              </div>
              <Badge tone={STATUS_TONES[t.status] ?? "neutral"}>{t.status}</Badge>
              <Button variant="link" size="sm" onClick={() => goTo("support")}>
                Open in Support
              </Button>
            </div>
          ))}
        </section>
      )}

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Choose your CRM</h2>
          <span className="text-muted">One-time build price. You approve the final plan before anything is billed.</span>
        </div>
      </div>

      <div className="crm-packages">
        {PACKAGE_KEYS.map((key) => {
          const p = CRM_PACKAGES[key];
          return (
            <article className={`card crm-package${p.tag ? " crm-package--featured" : ""}`} key={key}>
              {p.tag && (
                <Badge tone="brand" mono>
                  {p.tag}
                </Badge>
              )}
              <div className="stack stack--4">
                <span className="crm-package__name">{p.label}</span>
                <span className="crm-package__price">{formatCents(p.priceCents)}</span>
                <span className="text-muted">{p.tagline}</span>
              </div>
              <ul className="crm-package__includes">
                {p.includes.map((item) => (
                  <li key={item}>
                    <Icon name="check" size={14} strokeWidth={2.4} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <span className="text-small crm-package__timeline">
                <Icon name="clock" size={13} /> {p.timeline}
              </span>
              {!readOnly && (
                <Button variant={p.tag ? "primary" : "outline"} size="lg" onClick={() => setRequesting(key)}>
                  Request {p.label}
                </Button>
              )}
            </article>
          );
        })}
      </div>

      <section className="card stack stack--10">
        <div className="stack stack--2">
          <h2 className="card-title">Add-ons</h2>
          <span className="text-small">Optional with either package. Your team quotes these with your blueprint.</span>
        </div>
        <div className="option-grid">
          {CRM_ADDONS.map((a) => (
            <div className="inset" key={a.key}>
              <span className="text-strong">{a.label}</span>
              <span className="text-small">{a.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack stack--10">
        <h2 className="card-title">How it works</h2>
        <ol className="crm-steps">
          {CRM_STEPS.map((s, i) => (
            <li className="crm-steps__step" key={s.title}>
              <span className="kicker kicker--sm kicker--muted">STEP {i + 1}</span>
              <span className="text-strong">{s.title}</span>
              <span className="text-small">{s.desc}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card stack stack--10">
        <h2 className="card-title">Questions</h2>
        {CRM_FAQ.map((f) => (
          <details className="crm-faq" key={f.q}>
            <summary className="text-strong">{f.q}</summary>
            <p className="text-small">{f.a}</p>
          </details>
        ))}
      </section>

      {requesting && <CrmRequestModal initial={requesting} onClose={() => setRequesting(null)} />}
    </div>
  );
}

type Draft = {
  package: CrmPackageKey;
  sells: string;
  teamSize: string;
  currentTools: string;
  mustHaves: string;
  addons: string[];
  deadline: string;
};

function CrmRequestModal({ initial, onClose }: { initial: CrmPackageKey; onClose: () => void }) {
  const { notify } = usePortal();
  const create = useCreatePortalTicket();
  const [error, setError] = useState("");
  const [draft, setDraftState] = useState<Draft>({
    package: initial,
    sells: "",
    teamSize: CRM_TEAM_SIZES[0],
    currentTools: "",
    mustHaves: "",
    addons: [],
    deadline: "",
  });
  const set = (patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
    setError("");
  };
  const toggleAddon = (label: string) =>
    set({ addons: draft.addons.includes(label) ? draft.addons.filter((a) => a !== label) : [...draft.addons, label] });
  const pkg = CRM_PACKAGES[draft.package];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.sells.trim()) return setError("Please tell us what your business sells.");
    const description = [
      `Package: ${pkg.label} (${formatCents(pkg.priceCents)})`,
      `What we sell: ${draft.sells.trim()}`,
      `Team size: ${draft.teamSize}`,
      `Current tools: ${draft.currentTools.trim() || "—"}`,
      `Add-ons: ${draft.addons.join(", ") || "None"}`,
      `Ideal launch date: ${draft.deadline.trim() || "—"}`,
      "",
      "Must-haves:",
      draft.mustHaves.trim() || "—",
    ].join("\n");
    create.mutate(
      { type: "feature", title: `${CRM_REQUEST_PREFIX}: ${pkg.label}`, description, priority: "Medium" },
      {
        onSuccess: (t) => {
          notify(`${t.code} sent. Your GoCWGL team will reach out to book your discovery call.`);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      variant="drawer"
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="crm-title"
      kicker="NEW CRM"
      title="Request a CRM build"
      subtitle="Nothing is billed yet. We book a discovery call, then send your blueprint and invoice to approve."
      media={
        <IconTile tone="purple" size="lg">
          <Icon name="users" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-muted">
            From <strong className="u-mono u-ink">{formatCents(pkg.priceCents)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="stack stack--8">
        <span className="kicker">01 · CHOOSE A PACKAGE</span>
        <div className="option-grid">
          {PACKAGE_KEYS.map((key) => (
            <button key={key} type="button" className="option-card" aria-pressed={draft.package === key} onClick={() => set({ package: key })}>
              <span className="option-card__head">
                <span>{CRM_PACKAGES[key].label}</span>
                <span className="option-card__price">{formatCents(CRM_PACKAGES[key].priceCents)}</span>
              </span>
              <span className="option-card__desc">{CRM_PACKAGES[key].tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stack stack--10">
        <span className="kicker">02 · TELL US ABOUT YOUR BUSINESS</span>
        <Field label="What does your business sell?" htmlFor="crm-sells" required>
          <Input
            id="crm-sells"
            value={draft.sells}
            aria-invalid={!!error && !draft.sells.trim()}
            onChange={(e) => set({ sells: e.target.value })}
            placeholder="e.g. Home renovations for homeowners in Austin"
          />
        </Field>
        <Field label="How many people will use the CRM?" htmlFor="crm-team">
          <Select id="crm-team" options={CRM_TEAM_SIZES} value={draft.teamSize} onChange={(e) => set({ teamSize: e.target.value })} />
        </Field>
        <Field label="What do you use today?" htmlFor="crm-tools" hint="Spreadsheets, HubSpot, GoHighLevel, pen and paper…">
          <Input id="crm-tools" value={draft.currentTools} onChange={(e) => set({ currentTools: e.target.value })} />
        </Field>
        <Field label="Must-haves: what should your CRM do for you?" htmlFor="crm-must">
          <Textarea
            id="crm-must"
            rows={4}
            value={draft.mustHaves}
            onChange={(e) => set({ mustHaves: e.target.value })}
            placeholder="e.g. Send a quote after a site visit, remind us to follow up after 3 days, track jobs from booked to paid."
          />
        </Field>
        <Field label="Ideal launch date" htmlFor="crm-deadline">
          <Input id="crm-deadline" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} placeholder="e.g. Before March" />
        </Field>
      </div>

      <div className="stack stack--8">
        <span className="kicker">03 · ADD-ONS (OPTIONAL)</span>
        {CRM_ADDONS.map((a) => (
          <Checkbox key={a.key} label={`${a.label}: ${a.desc}`} checked={draft.addons.includes(a.label)} onChange={() => toggleAddon(a.label)} />
        ))}
      </div>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      <FormError error={create.error} />
    </Modal>
  );
}
