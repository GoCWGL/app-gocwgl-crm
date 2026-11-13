"use client";

import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";

const PORTALS: Array<{ href: string; icon: IconName; title: string; text: string }> = [
  { href: "/va", icon: "briefcase", title: "VA portal", text: "What your VAs see: their dashboard, clients, time and training." },
  { href: "/portal", icon: "user", title: "Client portal", text: "Opens a client's portal (Funnels, CRM, Build progress and more)." },
];

/** Settings › Portals: switch view to the VA portal or the client portal. */
export function PortalLinks() {
  const router = useRouter();
  return (
    <div className="stack stack--8">
      {PORTALS.map((p) => (
        <button key={p.href} type="button" className="link-card" onClick={() => router.push(p.href)}>
          <span className="link-card__icon" aria-hidden="true">
            <Icon name={p.icon} size={17} />
          </span>
          <span className="stack stack--2 u-grow">
            <span className="text-strong">{p.title}</span>
            <span className="text-small">{p.text}</span>
          </span>
          <Icon name="arrowRight" size={16} />
        </button>
      ))}
    </div>
  );
}
