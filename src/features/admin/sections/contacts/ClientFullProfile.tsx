"use client";

import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, FolderGlyph, Icon, IconTile, LoadState, type IconName } from "@/components/ui";
import { SOCIAL_LABELS, SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn, copyToClipboard } from "@/lib/utils";
import type { ContactOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { formatPerInterval } from "@/utils/format/money";
import { useSubscriptions } from "@/utils/hooks/useBilling";
import { useContact, usePipelines } from "@/utils/hooks/useContacts";
import { useClientLinks, useMediaFolders } from "@/utils/hooks/useDelivery";
import { useCanUseMenu, useMe } from "@/utils/hooks/useUsers";
import { ClientEmbedsCard } from "../../components/ClientEmbedsCard";
import { ClientVaWorkCard } from "../../components/ClientVaWorkCard";
import { ClientVasCard } from "../../components/ClientVasCard";
import { ContactAnswersCard } from "../../components/ContactAnswersCard";
import { ContactNotesCard } from "../../components/ContactNotesCard";
import { ContactOverviewCard } from "../../components/ContactOverviewCard";
import { PortalLoginCard } from "../../components/PortalLoginCard";
import { ReferredByContactCard } from "../../components/ReferredByContactCard";
import {
  CONTACT_STATUS,
  callText,
  contactName,
  contactStatus,
  getSalesStages,
  isOnboardingClient,
  stageOf,
  subscriptionOf,
} from "../../lib/contacts";
import { CallInviteModal } from "../../modals/CallInviteModal";
import { useAdmin } from "../../state/AdminContext";

/** People › Clients › one client: everything about them on one page (editing opens the edit panel). */
export function ClientFullProfile({ id }: { id: string }) {
  const { update } = useAdmin();
  const contact = useContact(id);
  return (
    <div className="page-stack">
      <div>
        <button type="button" className="vp-back" onClick={() => update({ clientFullId: "" })}>
          <Icon name="arrowLeft" size={14} /> All clients
        </button>
      </div>
      <LoadState query={contact} loadingText="Loading profile…">
        {contact.data && <Profile c={contact.data} />}
      </LoadState>
    </div>
  );
}

function Profile({ c }: { c: ContactOut }) {
  const { update, openMediaFolder } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const subs = useSubscriptions(c.id).data;
  const sub = subscriptionOf(subs, c.id);
  const stages = getSalesStages(usePipelines().data);
  const stage = stageOf(stages, c.stage);
  const onboarding = isOnboardingClient(c, subs);
  const statusKey = onboarding ? "onboarding" : contactStatus(c.stage, sub?.status === "Paused", !!c.archivedAt);
  const status = CONTACT_STATUS[statusKey];
  const name = contactName(c);
  const [inviting, setInviting] = useState(false);

  const meta: Array<{ icon: IconName; text: string; href?: string }> = [
    { icon: "mail", text: c.email, href: `mailto:${c.email}` },
    ...(c.phone ? [{ icon: "phone" as const, text: c.phone, href: `tel:${c.phone.replace(/[^+\d]/g, "")}` }] : []),
    ...(c.website ? [{ icon: "globe" as const, text: c.website.replace(/^https?:\/\//, ""), href: c.website }] : []),
  ];

  const stats: Array<{ icon: IconName; tone: Tone; label: string; value: string }> = [
    { icon: "pipeline", tone: stage.tone, label: "Stage", value: stage.label },
    {
      icon: "card",
      tone: "green",
      label: "Subscription",
      value: sub ? `${formatPerInterval(sub.amountCents, sub.interval, sub.currency)} · ${sub.status}` : "None",
    },
    { icon: "calendar", tone: "purple", label: "Signed up", value: formatShort(c.createdAt) },
    { icon: "calendarCheck", tone: "sky", label: "Call", value: callText(c) },
  ];

  const details: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "mail", label: "Email", value: c.email },
    { icon: "phone", label: "Phone", value: c.phone || "—" },
    { icon: "building", label: "Business", value: c.company || "—" },
    { icon: "globe", label: "Website", value: c.website ? c.website.replace(/^https?:\/\//, "") : "—" },
    { icon: "link", label: "Source", value: SOURCE_LABELS[c.source as LeadSource] ?? c.source },
    { icon: "calendar", label: "Paid on", value: c.paidOn ? formatShort(c.paidOn) : "—" },
  ];

  return (
    <>
      <section className={cn("card vp-hero", toneClass(status.tone))}>
        <div className="vp-hero__cover" aria-hidden="true" />
        <div className="vp-hero__body">
          <Avatar name={name} tone={avatarTone(c.id)} size="xl" ring className="vp-hero__avatar" />
          <div className="vp-hero__main">
            <div className="vp-hero__title">
              <h2 className="vp-hero__name">{name}</h2>
              <Badge tone={status.tone} dot>
                {c.archivedAt ? "Archived" : status.label}
              </Badge>
              <Badge tone={stage.tone}>{stage.label}</Badge>
            </div>
            <p className="vp-hero__headline">{[c.company, SOURCE_LABELS[c.source as LeadSource] ?? c.source].filter(Boolean).join(" · ")}</p>
            <ul className="vp-hero__meta">
              {meta.map((m) => (
                <li key={m.icon}>
                  <Icon name={m.icon} size={14} />
                  {m.href ? (
                    <a href={m.href} target={m.icon === "globe" ? "_blank" : undefined} rel="noopener noreferrer">
                      {m.text}
                    </a>
                  ) : (
                    <span>{m.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="vp-hero__actions">
            {canWrite && onboarding && (
              <Button variant="accent" onClick={() => setInviting(true)}>
                <Icon name="calendarCheck" size={14} /> Invite to a discovery call
              </Button>
            )}
            <Button variant="outline" onClick={() => update({ viewAsId: c.id })}>
              <Icon name="eye" size={14} /> View as client
            </Button>
            <Button variant="primary" onClick={() => update({ editContactId: c.id })}>
              <Icon name="edit" size={14} /> {canWrite ? "Edit profile" : "View details"}
            </Button>
          </div>
        </div>
        {inviting && <CallInviteModal kind="discovery" id={c.id} name={name} email={c.email} onClose={() => setInviting(false)} />}
      </section>

      <div className="vp-stats">
        {stats.map((st) => (
          <div key={st.label} className="card vp-stat">
            <IconTile tone={st.tone} size="sm">
              <Icon name={st.icon} size={15} strokeWidth={2} />
            </IconTile>
            <span className="stack stack--2">
              <span className="vp-stat__label">{st.label}</span>
              <span className="vp-stat__value">{st.value}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="vp-grid">
        <div className="vp-grid__main">
          <section className="card vp-card vp-card--flush">
            <ContactOverviewCard contact={c} />
          </section>
          <ClientVasCard contactId={c.id} />
          <section className="card vp-card vp-card--flush cw-card">
            <ClientVaWorkCard contactId={c.id} canEdit={canWrite} />
          </section>
          <section className="card vp-card vp-card--flush">
            <ContactNotesCard contact={c} />
          </section>
          {/* Form and survey answers (nothing when they have none). */}
          <section className="card vp-card vp-card--flush">
            <div className="inset stack stack--12">
              <ContactAnswersCard contact={c} />
            </div>
          </section>
          <section className="card vp-card vp-card--flush">
            <ClientEmbedsCard clientId={c.id} />
          </section>
        </div>

        <aside className="vp-grid__side">
          <ProfileCard icon="user" title="Contact details">
            <dl className="vp-details">
              {details.map((d) => (
                <div key={d.label} className="vp-details__row">
                  <dt>
                    <Icon name={d.icon} size={14} />
                    {d.label}
                  </dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          </ProfileCard>
          <ProfileCard icon="tag" title="Tags" count={c.tags.length}>
            {c.tags.length ? (
              <div className="vp-skills">
                {c.tags.map((t) => (
                  <span key={t.id} className="vp-skill">
                    {t.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="vp-empty">No tags. Add them with Edit profile.</span>
            )}
          </ProfileCard>
          <section className="card vp-card vp-card--flush">
            <PortalLoginCard contact={c} />
          </section>
          <section className="card vp-card vp-card--flush">
            <ReferredByContactCard contact={c} />
          </section>
          <ClientLinks contactId={c.id} />
          <MediaFolderLink contactId={c.id} onOpen={() => openMediaFolder(c.id)} />
        </aside>
      </div>
    </>
  );
}

function ProfileCard({ icon, title, count, children }: { icon: IconName; title: string; count?: number; children: ReactNode }) {
  return (
    <section className="card vp-card">
      <header className="vp-card__head">
        <span className="vp-card__icon" aria-hidden="true">
          <Icon name={icon} size={14} />
        </span>
        <h3 className="vp-card__title">{title}</h3>
        {count !== undefined && <span className="vp-card__count">{count}</span>}
      </header>
      {children}
    </section>
  );
}

/** Social media and links the client added in their portal. */
function ClientLinks({ contactId }: { contactId: string }) {
  const links = useClientLinks(contactId).data;
  const [copied, setCopied] = useState(false);
  const socials = Object.entries(links?.socials ?? {}).filter(([, url]) => !!url);
  const custom = (links?.custom ?? []) as Array<{ label: string; url: string }>;
  const items = [
    ...socials.map(([key, url]) => ({ ...(SOCIAL_LABELS[key] ?? { label: key, short: key.slice(0, 2), tone: "brand" as const }), url })),
    ...custom.map((l) => ({ label: l.label, short: "↗", tone: "brand" as const, url: l.url })),
  ];
  if (!items.length) return null;
  return (
    <section className="card vp-card">
      <header className="vp-card__head">
        <span className="vp-card__icon" aria-hidden="true">
          <Icon name="link" size={14} />
        </span>
        <h3 className="vp-card__title">Social media &amp; links</h3>
        <span className="vp-card__count">{items.length}</span>
        <span className="vp-card__action">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              copyToClipboard(items.map((x) => `${x.label}: ${x.url}`).join("\n"));
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy all"}
          </Button>
        </span>
      </header>
      <div className="stack stack--4">
        {items.map((l) => (
          <div className="client-links__row" key={l.url}>
            <span className={cn("client-links__badge", toneClass(l.tone))} aria-hidden="true">
              {l.short}
            </span>
            <span className="client-links__label">{l.label}</span>
            <a className="client-links__url" href={l.url} target="_blank" rel="noopener noreferrer">
              {l.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
        ))}
      </div>
      <span className="text-tiny">Added by the client in their portal{links?.updatedAt ? ` · updated ${formatShort(links.updatedAt)}` : ""}.</span>
    </section>
  );
}

function MediaFolderLink({ contactId, onOpen }: { contactId: string; onOpen: () => void }) {
  const seeMedia = useCanUseMenu("media");
  const folder = useMediaFolders().data?.find((f) => f.contactId === contactId);
  if (!seeMedia) return null;
  return (
    <button type="button" className="card vp-card vp-link" onClick={onOpen}>
      <FolderGlyph width={26} height={22} strokeWidth={2.5} fill="rgba(255,153,0,0.18)" stroke="#FF9900" />
      <span className="stack stack--2 u-grow">
        <span className="text-strong">Media folder</span>
        <span className="text-small">{folder?.fileCount ? `${folder.fileCount} files · logos, photos and documents` : "Empty — files they upload appear here"}</span>
      </span>
      <Icon name="arrowRight" size={15} />
    </button>
  );
}
