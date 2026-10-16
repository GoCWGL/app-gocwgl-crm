"use client";

import { Badge, Button, StatGrid } from "@/components/ui";
import { INCIDENTS } from "@/data/portal";
import { cn } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

type Component = {
  name: string;
  detail: string;
  metric: string;
  ok: boolean;
  action?: { label: string; run: () => void };
};

export function HealthSection() {
  const { state, update } = usePortal();
  const { calendarFixed, emailFixed } = state;

  const groups: Array<{ title: string; items: Component[] }> = [
    {
      title: "PAGES & FORMS",
      items: [
        { name: "Landing page", detail: "rahmanwellness.example · loads in 1.2s", metric: "99.98% uptime", ok: true },
        { name: "Signup form", detail: "Last submission 12 minutes ago", metric: "46 this month", ok: true },
        { name: "Booking page", detail: "Discovery Call calendar", metric: "19 booked", ok: true },
      ],
    },
    {
      title: "AUTOMATIONS",
      items: [
        { name: "Welcome email", detail: "Sends when someone signs up", metric: "46 sent · 0 failed", ok: true },
        { name: "Booking reminders", detail: "Email + text 1 hour before calls", metric: "19 sent · 0 failed", ok: true },
        {
          name: "Payment follow-up email",
          detail: emailFixed ? "Fixed — sending normally" : "1 email bounced: the address had a typo",
          metric: emailFixed ? "7 sent · 0 failed" : "6 sent · 1 failed",
          ok: emailFixed,
          action: {
            label: "Ask team to fix",
            run: () =>
              update({ emailFixed: true, toast: "Thanks! We sent this to your GoCWGL team and they are fixing it." }),
          },
        },
      ],
    },
    {
      title: "CONNECTIONS",
      items: [
        {
          name: "Calendar sync (Google)",
          detail: calendarFixed
            ? "Reconnected — syncing every 5 minutes"
            : "Access expires in 5 days. Reconnect to keep blocking busy times.",
          metric: calendarFixed ? "Synced just now" : "Synced 3 min ago",
          ok: calendarFixed,
          action: { label: "Reconnect", run: () => update({ calendarFixed: true, toast: "Google Calendar reconnected." }) },
        },
        { name: "Payments (Stripe)", detail: "Checkout on your booking page", metric: "7 payments this month", ok: true },
        { name: "Email sending domain", detail: "mail.rahmanwellness.example", metric: "98.6% delivered", ok: true },
      ],
    },
  ];

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Uptime this month", value: "99.98%", tone: "green" },
          { label: "Automation runs", value: "78", tone: "cyan" },
          { label: "Failed actions", value: emailFixed ? "0" : "1", tone: emailFixed ? "green" : "amber" },
          { label: "Email delivery", value: "98.6%", tone: "purple" },
        ]}
      />

      {groups.map((group) => (
        <section className="card health-group" key={group.title}>
          <h2 className="kicker health-group__title">{group.title}</h2>
          {group.items.map((c) => (
            <div className="list-row" key={c.name}>
              <span className={cn("health-dot", c.ok ? "tone-green" : "tone-amber")} aria-hidden="true" />
              <div className="stack stack--2 health-group__name">
                <span className="text-strong">{c.name}</span>
                <span className="text-small">{c.detail}</span>
              </div>
              <span className="health-group__metric">{c.metric}</span>
              <Badge tone={c.ok ? "green" : "amber"}>{c.ok ? "Running" : "Needs attention"}</Badge>
              {!c.ok && c.action && (
                <Button variant="primary" size="sm" onClick={c.action.run}>
                  {c.action.label}
                </Button>
              )}
            </div>
          ))}
        </section>
      ))}

      <section className="card">
        <h2 className="kicker">INCIDENT LOG</h2>
        <div>
          {INCIDENTS.map((i) => (
            <div className="list-row list-row--nowrap" key={i.date}>
              <span className="incident__date">{i.date}</span>
              <div className="stack stack--2">
                <span className="u-strong">{i.title}</span>
                <span className="text-small">{i.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
