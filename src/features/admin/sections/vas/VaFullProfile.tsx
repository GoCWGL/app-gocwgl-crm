"use client";

import { useDeferredValue, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, ConfirmDialog, FormError, Icon, IconTile, Input, LoadState, Modal, type IconName } from "@/components/ui";
import { formatDuration } from "@/lib/duration";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaDetailOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { useInviteVa, useSetVaClientRate, useSetVaClients, useVa } from "@/utils/hooks/useVas";
import { contactName } from "../../lib/contacts";
import { LOGIN_STATUS, rateText, VA_STATUS, vaRate } from "../../lib/vas";
import { hasSchool, jobDates, schoolDates, schoolTitle } from "../../../va/lib/resumeFormat";
import { CallInviteModal } from "../../modals/CallInviteModal";
import { useAdmin } from "../../state/AdminContext";

/** People › VAs › one VA: everything about them on one page, plus the clients they support. */
export function VaFullProfile({ id }: { id: string }) {
  const { update } = useAdmin();
  const va = useVa(id);
  const back = (
    <button type="button" className="vp-back" onClick={() => update({ vaFullId: "" })}>
      <Icon name="arrowLeft" size={14} /> All VAs
    </button>
  );
  return (
    <div className="page-stack">
      <div>{back}</div>
      <LoadState query={va} loadingText="Loading profile…">
        {va.data && <Profile va={va.data} />}
      </LoadState>
    </div>
  );
}

/** Their current local time ("3:42 PM"), or "" for an unknown time zone. */
function localTime(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date());
  } catch {
    return "";
  }
}

function Profile({ va }: { va: VaDetailOut }) {
  const { update, notify, openClient } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const status = VA_STATUS[va.status];
  const login = LOGIN_STATUS[va.loginStatus as keyof typeof LOGIN_STATUS] ?? LOGIN_STATUS.none;
  const [assigning, setAssigning] = useState(false);
  const [interviewing, setInterviewing] = useState(false);
  const setClients = useSetVaClients();
  const invite = useInviteVa();
  // Taking a client off a VA is confirmed first.
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const removeClient = (contactId: string) =>
    setClients.mutate({ id: va.id, contactIds: va.clients.map((c) => c.id).filter((c) => c !== contactId) }, { onSuccess: () => setRemoving(null) });
  const time = localTime(va.timezone);
  const canInvite = canWrite && va.isActive && va.loginStatus !== "active";

  const meta: Array<{ icon: IconName; text: string; href?: string }> = [
    { icon: "mail", text: va.email, href: `mailto:${va.email}` },
    ...(va.phone ? [{ icon: "phone" as const, text: va.phone, href: `tel:${va.phone.replace(/[^+\d]/g, "")}` }] : []),
    ...(va.country ? [{ icon: "globe" as const, text: va.country }] : []),
    ...(time ? [{ icon: "clock" as const, text: `${time} their time` }] : []),
  ];

  const stats: Array<{ icon: IconName; tone: Tone; label: string; value: string }> = [
    { icon: "users", tone: "cyan", label: "Clients", value: String(va.clients.length) },
    {
      icon: "dollar",
      tone: "green",
      // What GoCWGL pays them; until the team sets it, the rate on their resume (marked as asking).
      label: vaRate(va).asking ? "Asking rate (resume)" : "Hourly rate",
      value: rateText(vaRate(va).cents, (c) => formatCentsExact(c)),
    },
    { icon: "calendar", tone: "purple", label: "Started", value: va.startedOn ? formatShort(va.startedOn) : "Not set" },
    { icon: "clock", tone: "slate", label: "Last sign-in", value: va.lastLoginAt ? formatShort(va.lastLoginAt) : "Never" },
  ];

  // What the VA keeps on their resume (they edit it in the VA portal).
  const resume = va.resume;
  const jobs = (resume?.workHistory ?? []).filter((j) => j.title || j.company);
  const schools = (resume?.education ?? []).filter(hasSchool);
  const certs = (resume?.certifications ?? []).filter((c) => c.name);
  const resumeFacts: Array<{ icon: IconName; label: string; value: string }> = resume
    ? [
        ...(resume.rateCents != null ? [{ icon: "dollar" as const, label: "Asking rate", value: rateText(resume.rateCents, (c) => formatCentsExact(c)) }] : []),
        ...(resume.yearsExperience ? [{ icon: "briefcase" as const, label: "Experience", value: `${resume.yearsExperience.replace(/\s*years?$/i, "")} years` }] : []),
        ...(resume.availability ? [{ icon: "calendar" as const, label: "Availability", value: resume.availability }] : []),
        ...(resume.workingHours ? [{ icon: "clock" as const, label: "Working hours", value: resume.workingHours }] : []),
        ...(resume.languages?.length ? [{ icon: "globe" as const, label: "Languages", value: (resume.languages ?? []).join(", ") }] : []),
        ...(resume.tools?.length ? [{ icon: "settings" as const, label: "Tools", value: (resume.tools ?? []).join(", ") }] : []),
        ...(resume.website ? [{ icon: "link" as const, label: "Website", value: resume.website.replace(/^https?:\/\//, "") }] : []),
      ]
    : [];

  const details: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "mail", label: "Email", value: va.email },
    { icon: "phone", label: "Phone", value: va.phone || "—" },
    { icon: "globe", label: "Country", value: va.country || "—" },
    { icon: "clock", label: "Time zone", value: va.timezone.replace(/_/g, " ") },
    { icon: "shield", label: "VA portal", value: login.label },
    { icon: "calendar", label: "Added", value: formatShort(va.createdAt) },
  ];

  return (
    <>
      <section className={cn("card vp-hero", toneClass(status.tone))}>
        <div className="vp-hero__cover" aria-hidden="true" />
        <div className="vp-hero__body">
          <Avatar name={va.fullName} tone={avatarTone(va.id)} size="xl" ring className="vp-hero__avatar" />
          <div className="vp-hero__main">
            <div className="vp-hero__title">
              <h2 className="vp-hero__name">{va.fullName}</h2>
              <Badge tone={status.tone} dot>
                {va.isActive ? status.label : "Deactivated"}
              </Badge>
              <Badge tone={login.tone}>{login.label}</Badge>
            </div>
            <p className="vp-hero__headline">{va.headline || "No headline yet"}</p>
            <ul className="vp-hero__meta">
              {meta.map((m) => (
                <li key={m.icon}>
                  <Icon name={m.icon} size={14} />
                  {m.href ? <a href={m.href}>{m.text}</a> : <span>{m.text}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="vp-hero__actions">
            {canWrite && va.isActive && va.status === "onboarding" && (
              <Button variant="accent" onClick={() => setInterviewing(true)}>
                <Icon name="calendarCheck" size={14} /> Invite to an interview
              </Button>
            )}
            {canInvite && (
              <Button
                variant="outline"
                disabled={invite.isPending}
                onClick={() => invite.mutate(va.id, { onSuccess: () => notify(`Invite sent to ${va.email}.`) })}
              >
                <Icon name="send" size={14} /> {va.loginStatus === "invited" ? "Resend portal invite" : "Send portal invite"}
              </Button>
            )}
            <a className="btn btn--outline" href={`/va?as=${va.id}`}>
              <Icon name="eye" size={14} /> View as VA
            </a>
            <Button variant="primary" onClick={() => update({ vaId: va.id })}>
              <Icon name="edit" size={14} /> {canWrite ? "Edit profile" : "View details"}
            </Button>
          </div>
        </div>
        {interviewing && (
          <CallInviteModal kind="interview" id={va.id} name={va.fullName} email={va.email} onClose={() => setInterviewing(false)} />
        )}
      </section>
      <FormError error={invite.error} />

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
          <ProfileCard icon="briefcase" title="Experience">
            {va.experience && <p className="va-pre">{va.experience}</p>}
            {jobs.length > 0 && (
              <ol className="vp-jobs">
                {jobs.map((j, i) => (
                  <li key={i}>
                    <div className="vp-jobs__head">
                      <strong>{j.title || "Role"}</strong>
                      <span>{jobDates(j)}</span>
                    </div>
                    {(j.company || j.location) && <span className="vp-jobs__co">{[j.company, j.location].filter(Boolean).join(" · ")}</span>}
                    {(j.bullets ?? []).filter((b) => b.trim()).length > 0 && (
                      <ul>
                        {(j.bullets ?? [])
                          .filter((b) => b.trim())
                          .map((b, k) => (
                            <li key={k}>{b}</li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {!va.experience && jobs.length === 0 && <span className="vp-empty">No experience added yet.</span>}
          </ProfileCard>
          {(schools.length > 0 || certs.length > 0) && (
            <ProfileCard icon="graduation" title="Education & certifications">
              <div className="vp-rows">
                {schools.map((e, i) => (
                  <div key={`s${i}`} className="vp-rows__row">
                    <span className="stack stack--2">
                      <strong>{schoolTitle(e)}</strong>
                      {e.school && schoolTitle(e) !== e.school && <span className="text-small">{[e.school, e.country].filter(Boolean).join(", ")}</span>}
                    </span>
                    <span className="text-small">{schoolDates(e)}</span>
                  </div>
                ))}
                {certs.map((c, i) => (
                  <div key={`c${i}`} className="vp-rows__row">
                    <span className="stack stack--2">
                      <strong>{c.name}</strong>
                      <span className="text-small">
                        {[c.issuer, c.result && `Result: ${c.result}`].filter(Boolean).join(" · ")}
                        {c.url && (
                          <>
                            {" · "}
                            <a href={c.url} target="_blank" rel="noreferrer">
                              Verify
                            </a>
                          </>
                        )}
                      </span>
                    </span>
                    <span className="text-small">{c.year}</span>
                  </div>
                ))}
              </div>
            </ProfileCard>
          )}
          <ProfileCard icon="user" title="About">
            <p className="va-pre">{va.bio || <span className="vp-empty">Nothing here yet.</span>}</p>
          </ProfileCard>
          <ProfileCard icon="star" title="Skills">
            {va.skills.length ? (
              <div className="vp-skills">
                {va.skills.map((sk) => (
                  <span key={sk} className="vp-skill">
                    {sk}
                  </span>
                ))}
              </div>
            ) : (
              <span className="vp-empty">No skills added yet.</span>
            )}
          </ProfileCard>
          <ProfileCard
            icon="users"
            title="Clients they support"
            count={va.clients.length}
            action={
              canWrite && (
                <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>
                  <Icon name="plus" size={13} /> Add a client
                </Button>
              )
            }
          >
            <FormError error={setClients.error} />
            {va.clients.length === 0 ? (
              <div className="vp-clients-empty">
                <Icon name="users" size={18} />
                <span>Not supporting any clients yet.</span>
              </div>
            ) : (
              <div className="vp-clist" role="table" aria-label="Clients they support">
                <div className="vp-clist__row vp-clist__row--head" role="row">
                  <span role="columnheader">Client</span>
                  <span role="columnheader">Since</span>
                  <span role="columnheader">This month</span>
                  <span role="columnheader">All time</span>
                  <span role="columnheader">Rate</span>
                  <span role="columnheader" aria-label="Actions" />
                </div>
                {va.clients.map((c) => {
                  const name = contactName({ ...c, name: "" });
                  return (
                    <div key={c.id} className="vp-clist__row" role="row">
                      <span role="cell" className="vp-clist__who">
                        <Avatar name={name} tone={avatarTone(c.id)} size="sm" />
                        <button type="button" className="vp-clist__name" onClick={() => openClient(c.id)} title="Open client profile">
                          <strong>{c.company || name}</strong>
                          <span>{[c.company ? name : "", c.email].filter(Boolean).join(" · ")}</span>
                        </button>
                      </span>
                      <span role="cell" className="vp-clist__cell" data-label="Since">
                        {c.since ? formatShort(c.since) : "—"}
                      </span>
                      <span role="cell" className="vp-clist__cell vp-clist__num" data-label="This month">
                        {formatDuration(c.monthSeconds ?? 0)}
                      </span>
                      <span role="cell" className="vp-clist__cell vp-clist__num" data-label="All time">
                        {formatDuration(c.totalSeconds ?? 0)}
                        {c.lastWorkedAt && <span className="vp-clist__sub">last {formatRelative(c.lastWorkedAt)}</span>}
                      </span>
                      <span role="cell" className="vp-clist__cell" data-label="Rate">
                        <ClientRate vaId={va.id} contactId={c.id} rateCents={c.rateCents ?? null} fallback={va.hourlyRateCents ?? null} disabled={!canWrite} />
                      </span>
                      <span role="cell" className="vp-clist__actions">
                        {canWrite && (
                          <button
                            type="button"
                            className="vp-client__remove"
                            aria-label={`Take ${name} off this VA`}
                            title="Take off this VA"
                            onClick={() => setRemoving({ id: c.id, name: c.company || name })}
                            disabled={setClients.isPending}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ProfileCard>
        </div>

        <aside className="vp-grid__side">
          <ResumeLinkCard va={va} />
          {resumeFacts.length > 0 && (
            <ProfileCard icon="textLong" title="From their resume">
              <dl className="vp-details">
                {resumeFacts.map((d) => (
                  <div key={d.label} className="vp-details__row">
                    <dt>
                      <Icon name={d.icon} size={14} />
                      {d.label}
                    </dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
              <span className="text-small">The VA keeps these up to date in their portal. The asking rate doesn’t change what GoCWGL pays them.</span>
            </ProfileCard>
          )}
          <ProfileCard icon="user" title="Contact & account">
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
          <ProfileCard icon="lock" title="Team notes" className="vp-notes">
            <p className="va-pre">{va.notes || <span className="vp-empty">No notes yet.</span>}</p>
            <span className="vp-notes__foot">Only your team sees these, never the VA.</span>
          </ProfileCard>
        </aside>
      </div>

      {assigning && <AddClientModal va={va} onClose={() => setAssigning(false)} />}
      {removing && (
        <ConfirmDialog
          title={`Take ${removing.name} off ${va.fullName}?`}
          confirmLabel="Take them off"
          icon="close"
          pending={setClients.isPending}
          error={setClients.error}
          onConfirm={() => removeClient(removing.id)}
          onClose={() => setRemoving(null)}
        >
          {va.fullName} won’t be able to log time for them any more. Their past time and invoices stay, and the client moves to the VA’s inactive clients.
        </ConfirmDialog>
      )}
    </>
  );
}

/** The VA's resume page: the link clients open, so the team can share it too. */
function ResumeLinkCard({ va }: { va: VaDetailOut }) {
  const [copied, setCopied] = useState(false);
  const url = va.resumeSlug && typeof window !== "undefined" ? `${window.location.origin}/resume/${va.resumeSlug}` : "";
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <ProfileCard
      icon="globe"
      title="Resume page"
      className="vp-resume"
      action={
        va.resumeSlug ? (
          <span className={cn("vp-resume__state", va.resumePublic ? "is-on" : "is-off")}>{va.resumePublic ? "Live" : "Turned off"}</span>
        ) : undefined
      }
    >
      {!va.resumeSlug ? (
        <span className="vp-empty">Not made yet. The VA builds their resume in the VA portal; the link shows up here once they save it.</span>
      ) : va.resumePublic ? (
        <>
          <a className="vp-resume__url" href={url} target="_blank" rel="noreferrer">
            {url.replace(/^https?:\/\//, "")}
          </a>
          <span className="cluster cluster--6">
            <Button size="sm" variant="outline" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} size={12} /> {copied ? "Copied" : "Copy link"}
            </Button>
            <a className="btn btn--sm btn--outline" href={url} target="_blank" rel="noreferrer">
              <Icon name="eye" size={12} /> Open
            </a>
          </span>
        </>
      ) : (
        <span className="text-small">The VA has turned their page off, so the link shows nothing right now.</span>
      )}
      <a className="vp-resume__edit" href={`/va?as=${va.id}&tab=resume`}>
        {va.resumeSlug ? "View or edit as the VA" : "Start it as the VA"} <Icon name="arrowRight" size={12} />
      </a>
    </ProfileCard>
  );
}

function ProfileCard({
  icon,
  title,
  count,
  action,
  className,
  children,
}: {
  icon: IconName;
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("card vp-card", className)}>
      <header className="vp-card__head">
        <span className="vp-card__icon" aria-hidden="true">
          <Icon name={icon} size={14} />
        </span>
        <h3 className="vp-card__title">{title}</h3>
        {count !== undefined && <span className="vp-card__count">{count}</span>}
        {action && <span className="vp-card__action">{action}</span>}
      </header>
      {children}
    </section>
  );
}

function AddClientModal({ va, onClose }: { va: VaDetailOut; onClose: () => void }) {
  const { notify } = useAdmin();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const contacts = useContactsPage({ q, limit: 12 });
  const taken = new Set(va.clients.map((c) => c.id));
  const list = (contacts.data?.items ?? []).filter((c) => !taken.has(c.id));
  const setClients = useSetVaClients();

  const add = (contactId: string, name: string) =>
    setClients.mutate(
      { id: va.id, contactIds: [...taken, contactId] },
      {
        onSuccess: () => {
          notify(`${va.fullName} now supports ${name}.`);
          onClose();
        },
      },
    );

  return (
    <Modal open onClose={onClose} titleId="va-add-client" kicker="CLIENTS" title={`Add a client for ${va.fullName}`} width={520}>
      <div className="stack stack--10">
        <FormError error={setClients.error} />
        <Input autoFocus aria-label="Find a client" placeholder="Name, email or business" value={query} onChange={(e) => setQuery(e.target.value)} />
        <LoadState query={contacts} isEmpty={!list.length} empty={q ? `No clients match “${q}”.` : "No more clients to add."} inline>
          <div className="stack stack--6">
            {list.map((c) => (
              <button key={c.id} type="button" className="link-card" onClick={() => add(c.id, contactName(c))} disabled={setClients.isPending}>
                <Avatar name={contactName(c)} tone={avatarTone(c.id)} />
                <span className="stack stack--2 u-grow">
                  <span className="text-strong">{contactName(c)}</span>
                  <span className="text-tiny">{[c.company, c.email].filter(Boolean).join(" · ")}</span>
                </span>
                <Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        </LoadState>
      </div>
    </Modal>
  );
}

/** The VA's pay per billable hour for one client; empty = their hourly rate. */
function ClientRate({ vaId, contactId, rateCents, fallback, disabled }: { vaId: string; contactId: string; rateCents: number | null; fallback: number | null; disabled: boolean }) {
  const save = useSetVaClientRate();
  const [value, setValue] = useState(rateCents != null ? (rateCents / 100).toFixed(2) : "");
  const commit = () => {
    const cents = value.trim() === "" ? null : Math.round(Number(value) * 100);
    if (cents !== null && (!Number.isFinite(cents) || cents < 0)) return setValue(rateCents != null ? (rateCents / 100).toFixed(2) : "");
    if (cents !== rateCents) save.mutate({ id: vaId, contactId, rateCents: cents });
  };
  return (
    <label className="vp-client__rate" title="Their pay per billable hour for this client. Leave empty to use their hourly rate.">
      <span>$</span>
      <input
        type="number"
        min={0}
        step={0.25}
        inputMode="decimal"
        aria-label="Rate for this client, per hour"
        placeholder={fallback != null ? (fallback / 100).toFixed(2) : "rate"}
        value={value}
        disabled={disabled || save.isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      />
      <span>/h</span>
    </label>
  );
}
