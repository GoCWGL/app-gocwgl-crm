"use client";

import { useState } from "react";
import { Badge, Button, Icon, IconTile, LoadState, SegmentedControl } from "@/components/ui";
import { CRM_ADDONS, CRM_FAQ, CRM_PACKAGES, CRM_STEPS, type CrmPackageKey } from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import { formatShort } from "@/utils/format/dates";
import { usePortalBuilds, usePortalCrmRequests } from "@/utils/hooks/useDelivery";
import { BuildCards } from "../components/BuildCards";
import { CrmRequestModal } from "../components/CrmRequestModal";
import { usePortal } from "../state/PortalContext";

const PACKAGE_KEYS = Object.keys(CRM_PACKAGES) as CrmPackageKey[];

type CrmTab = "builds" | "packages";

/** CRM page: the client's CRM builds in one tab, the packages to start a new one in the other. */
export function CrmSection() {
  const query = usePortalBuilds();
  const builds = (query.data ?? []).filter((b) => b.kind === "crm");
  // Requests not turned into a build yet (a started one shows as its build).
  const requests = (usePortalCrmRequests().data ?? []).filter((r) => !r.projectId && r.status !== "declined");
  const { update } = usePortal();
  const [picked, setPicked] = useState<CrmTab | "">("");
  // Open on their builds or requests when they have some, otherwise on the packages.
  const tab: CrmTab = picked || (builds.length || requests.length ? "builds" : "packages");

  return (
    <div className="page-stack">
      <SegmentedControl<CrmTab>
        kind="tabs"
        label="CRM"
        value={tab}
        onChange={setPicked}
        options={[
          { value: "builds", label: `Your CRM builds · ${builds.length}` },
          { value: "packages", label: "Get a CRM" },
        ]}
      />
      {tab === "builds" ? (
        <LoadState
          query={query}
          loadingText="Loading your CRM builds…"
          isEmpty={!builds.length && !requests.length}
          empty="No CRM builds yet. See Get a CRM for the packages, and request one to start."
        >
          {requests.length > 0 && (
            <section className="card stack stack--10">
              <span className="kicker">YOUR REQUESTS · {requests.length}</span>
              {requests.map((r) => (
                <div className="stack stack--2" key={r.id}>
                  <span className="text-strong">
                    {r.name} · {CRM_PACKAGES[r.package as CrmPackageKey]?.label ?? r.package}
                  </span>
                  <span className="text-small">
                    Requested {formatShort(r.createdAt)} ·{" "}
                    {r.status === "contacted" ? "Discovery call booked" : "Your team will review it before your call"}
                  </span>
                </div>
              ))}
            </section>
          )}
          {builds.length > 0 && (
            <>
              <div className="section-head">
                <div className="stack stack--2">
                  <h2 className="section-title">CRMs we’re building</h2>
                  <span className="text-muted">Every CRM your GoCWGL team is working on for you, with its progress</span>
                </div>
              </div>
              <BuildCards builds={builds} icon="users" />
            </>
          )}
        </LoadState>
      ) : (
        <CrmPackages
          onRequested={() => {
            // Back on their requests, where the new one now shows; the booking page is in its own tab.
            setPicked("builds");
            update({ toast: "Request sent to your GoCWGL team. Pick a time for your call in the new tab." });
          }}
        />
      )}
    </div>
  );
}

/**
 * CRM packages and how it works. "Request a CRM" saves what they want for the team, then sends them to book the
 * CRM discovery call on app.gocwgl.com. The team invoices CRM builds with their Wise payment link.
 */
function CrmPackages({ onRequested }: { onRequested: () => void }) {
  const { readOnly } = usePortal();
  const [requesting, setRequesting] = useState(false);

  return (
    <>
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

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Choose your CRM</h2>
          <span className="text-muted">
            One-time build price. Request a CRM to start: you book a call, then approve the plan and quote before anything is billed.
          </span>
        </div>
        {!readOnly && (
          <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => setRequesting(true)}>
            <Icon name="plus" strokeWidth={2.4} />
            Request a CRM
          </Button>
        )}
      </div>
      {requesting && (
        <CrmRequestModal
          onClose={() => setRequesting(false)}
          onRequested={() => {
            setRequesting(false);
            onRequested();
          }}
        />
      )}

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
              {p.note && <span className="inset inset--brand text-small crm-package__note">{p.note}</span>}
              <span className="text-small crm-package__timeline">
                <Icon name="clock" size={13} /> {p.timeline}
              </span>
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
    </>
  );
}
