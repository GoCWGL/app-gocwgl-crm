"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog, Icon, type IconName } from "@/components/ui";
import { isStaffAdmin, useSession } from "@/utils/auth/session";

type Portal = {
  id: "va" | "client";
  href: string;
  icon: IconName;
  title: string;
  text: string;
  inside: Array<{ icon: IconName; label: string }>;
  /** Which person's portal opens first. */
  opens: string;
  /** Whose portal it is, in the confirmation pop-up. */
  who: string;
};

const PORTALS: Portal[] = [
  {
    id: "va",
    href: "/va",
    icon: "briefcase",
    title: "VA portal",
    text: "Where your VAs run their day: clients, tasks, time and training.",
    inside: [
      { icon: "users", label: "Clients" },
      { icon: "clipboard", label: "Tasks" },
      { icon: "clock", label: "Time tracker" },
      { icon: "graduation", label: "Training" },
    ],
    opens: "Opens your first active VA",
    who: "a VA's",
  },
  {
    id: "client",
    href: "/portal",
    icon: "user",
    title: "Client portal",
    text: "Where clients follow their work: CRM, funnels, build progress and billing.",
    inside: [
      { icon: "grid", label: "CRM" },
      { icon: "funnel", label: "Funnels" },
      { icon: "rocket", label: "Build progress" },
      { icon: "card", label: "Billing" },
    ],
    opens: "Opens a paid client",
    who: "a client's",
  },
];

/** Settings › Portals: switch view to the VA portal or the client portal. */
export function PortalLinks() {
  const { user } = useSession();
  const canAct = isStaffAdmin(user);
  const router = useRouter();
  // The portal waiting for "are you sure?".
  const [confirming, setConfirming] = useState<Portal | null>(null);
  return (
    <div className="portal-cards">
      {PORTALS.map((p) => (
        <article key={p.id} className={`portal-card portal-card--${p.id}`} aria-labelledby={`portal-${p.id}`}>
          <div className="portal-card__stage">
            <span className="portal-card__access">
              <Icon name={canAct ? "edit" : "eye"} size={12} />
              {canAct ? "View and act" : "View only"}
            </span>
            <PortalPreview portal={p} />
          </div>
          <div className="portal-card__body">
            <div className="stack stack--6">
              <h3 className="portal-card__title" id={`portal-${p.id}`}>
                {p.title}
              </h3>
              <p className="portal-card__text">{p.text}</p>
            </div>
            <ul className="portal-card__inside" aria-label="What's inside">
              {p.inside.map((i) => (
                <li key={i.label}>
                  <Icon name={i.icon} size={14} />
                  {i.label}
                </li>
              ))}
            </ul>
            <div className="portal-card__footer">
              <span className="text-small">{p.opens}</span>
              <button type="button" className="portal-card__view" aria-haspopup="dialog" aria-label={`View portal: ${p.title}`} onClick={() => setConfirming(p)}>
                <span className="portal-card__label">View portal</span>
                <span className="portal-card__arrow" aria-hidden="true">
                  <Icon name="arrowRight" size={14} />
                </span>
              </button>
            </div>
          </div>
        </article>
      ))}

      {confirming && (
        <ConfirmDialog
          title={`View the ${confirming.title}?`}
          icon={confirming.icon}
          confirmLabel="Yes, view portal"
          onConfirm={() => {
            // Close it before leaving: the admin page keeps its state while you're in the portal, so a still-open
            // pop-up would greet you again on "Back to admin".
            const href = confirming.href;
            setConfirming(null);
            router.push(href);
          }}
          onClose={() => setConfirming(null)}
        >
          {`You'll leave the admin and see ${confirming.who} portal as they do. `}
          {canAct
            ? "Changes you make there are real and apply to their account."
            : "You can look around, but you can't make changes."}
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Decorative sketch of the portal's screen: no real data. */
function PortalPreview({ portal }: { portal: Portal }) {
  return (
    <span className="portal-mock" aria-hidden="true">
      <span className="portal-mock__side">
        <span className="portal-mock__mark">
          <Icon name={portal.icon} size={14} />
        </span>
        {portal.inside.map((i, n) => (
          <span key={i.label} className={n === 0 ? "portal-mock__nav is-on" : "portal-mock__nav"}>
            <Icon name={i.icon} size={11} />
            <i />
          </span>
        ))}
      </span>
      <span className="portal-mock__main">
        <i className="portal-mock__heading" />
        {portal.id === "va" ? (
          [72, 48, 60].map((w) => (
            <span key={w} className="portal-mock__row">
              <b />
              <i style={{ width: `${w}%` }} />
              <em />
            </span>
          ))
        ) : (
          <>
            <span className="portal-mock__stats">
              <span />
              <span />
              <span />
            </span>
            <span className="portal-mock__chart">
              {[34, 52, 44, 68, 60, 84, 100].map((h) => (
                <i key={h} style={{ height: `${h}%` }} />
              ))}
            </span>
          </>
        )}
      </span>
    </span>
  );
}
