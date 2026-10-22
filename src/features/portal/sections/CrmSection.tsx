"use client";

import { Badge, Icon, IconTile, buttonClass } from "@/components/ui";
import { CRM_ADDONS, CRM_BOOKING_URL, CRM_FAQ, CRM_PACKAGES, CRM_STEPS, type CrmPackageKey } from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import { usePortal } from "../state/PortalContext";

const PACKAGE_KEYS = Object.keys(CRM_PACKAGES) as CrmPackageKey[];

/**
 * CRM builds: the two packages and how it works. Requests start with a CRM discovery call booked on app.gocwgl.com; the team
 * invoices CRM builds personally (not through Polar), so nothing here creates a request or an invoice.
 */
export function CrmSection() {
  const { readOnly } = usePortal();

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

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Choose your CRM</h2>
          <span className="text-muted">One-time build price. Book a call to start: you approve the plan and quote before anything is billed.</span>
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
              {p.note && <span className="inset inset--brand text-small crm-package__note">{p.note}</span>}
              <span className="text-small crm-package__timeline">
                <Icon name="clock" size={13} /> {p.timeline}
              </span>
              {!readOnly && (
                <a
                  className={buttonClass({ variant: p.tag ? "primary" : "outline", size: "lg" })}
                  href={`${CRM_BOOKING_URL}?package=${key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book a call for {p.label} ↗
                </a>
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
    </div>
  );
}
