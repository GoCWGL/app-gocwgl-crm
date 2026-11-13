"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";
import { resumeVideo, type ResumeVideo } from "@/lib/video";
import type { ResumeCert, ResumeHighlights, ResumeJob, ResumeSchool } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { socialLabel, type SocialLink } from "../lib/socials";
import { hasSchool, jobDates, schoolDates, schoolTitle } from "../lib/resumeFormat";
import { ResumePrint } from "./ResumePrint";
import { SocialIcon, brandColor } from "./SocialIcon";

/** What a resume shows (the editor's draft, or the public page). */
export type ResumeContent = {
  name: string;
  title: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  /** Social media and work profiles (LinkedIn, Facebook, Upwork…), in the VA's order. */
  socialLinks: SocialLink[];
  /** The uploaded headshot (null = initials). */
  photoId: string | null;
  introVideoUrl: string;
  rateCents: number | null;
  workingHours: string;
  availability: string;
  yearsExperience: string;
  skills: string[];
  tools: string[];
  languages: string[];
  workHistory: ResumeJob[];
  education: ResumeSchool[];
  certifications: ResumeCert[];
  showGocwgl: boolean;
};

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const href = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

const CERT_LABEL: Record<string, string> = { personality: "Personality test", skills: "Skills test", other: "Other" };

/** How complete the resume is, and the next thing to add (shown to the VA, never to clients). */
export function completeness(d: ResumeContent): { pct: number; next: string } {
  const checks: Array<[boolean, string]> = [
    [!!d.title, "Add a professional title"],
    [!!d.summary, "Write a short About me"],
    [!!d.introVideoUrl, "Add an intro video"],
    [d.skills.length >= 3, "List at least 3 skills"],
    [d.workHistory.some((j) => j.title || j.company), "Add your work experience"],
    [!!d.location, "Add your location"],
    [d.rateCents != null, "Add your hourly rate"],
    [!!d.availability, "Add your availability"],
    [!!d.workingHours, "Add your working hours"],
    [d.languages.length > 0, "Add the languages you speak"],
    [d.education.some((e) => e.school || e.degree) || d.certifications.some((c) => c.name), "Add education or a certification"],
    [d.socialLinks.length > 0, "Add your social media links"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { pct: Math.round((done / checks.length) * 100), next: checks.find(([ok]) => !ok)?.[1] ?? "" };
}

/**
 * A VA's resume as a clean profile page: a header card with the headshot, then About, intro video, skills and
 * experience on the left, and details, links and certifications on the right. It lays itself out by its own width.
 * `editor` adds what only the VA sees (profile completeness).
 */
export function ResumePaper({
  d,
  memberSince,
  updatedAt,
  h,
  editor,
  onAddLink,
  openDocument,
  pageUrl,
  photoUrl,
}: {
  d: ResumeContent;
  memberSince: string;
  /** When the resume was last saved (the "Resume.pdf · Updated …" row). */
  updatedAt?: string | null;
  h: ResumeHighlights | null;
  editor?: boolean;
  /** Editor only: jump to the portfolio field. */
  onAddLink?: () => void;
  /** Opens an attached result document (the public page and the editor fetch it differently). */
  openDocument?: (documentId: string) => void;
  /** The resume page link, printed in the PDF's footer. */
  pageUrl?: string;
  /** Where to load the headshot from (the editor and the public page get it differently). */
  photoUrl?: string | null;
}) {
  const first = d.name.split(/\s+/)[0] || "me";
  const initials =
    d.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "VA";
  const since = new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  // Details: the month in full ("November 2026"); job dates stay short like the others.
  const sinceLong = new Date(memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const gocwgl = d.showGocwgl && !!h;
  const video = resumeVideo(d.introVideoUrl);
  const jobs = d.workHistory.filter((j) => j.title || j.company);
  const schools = d.education.filter(hasSchool);
  const certs = [
    ...d.certifications
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name ?? "", year: c.year ?? "", issuer: c.issuer ?? "", kind: c.kind ?? "certification", result: c.result ?? "",
        documentId: c.documentId ?? null, documentType: c.documentType ?? "", url: c.url ?? "", credentialId: c.credentialId ?? "",
      })),
    ...(gocwgl
      ? h.trainingsPassed.map((t) => ({ name: t, year: "", issuer: "GoCWGL training", kind: "certification", result: "", documentId: null, documentType: "", url: "", credentialId: "" }))
      : []),
  ];
  const badges = gocwgl
    ? [
        ...(h.activeClients > 0 ? [{ tone: "blue", text: "Placed" }] : []),
        { tone: "green", text: "GoCWGL verified" },
        ...(h.trainingsPassed.length ? [{ tone: "green", text: `${h.trainingsPassed.length} training${h.trainingsPassed.length === 1 ? "" : "s"} passed` }] : []),
        ...(h.ratingAverage != null ? [{ tone: "amber", text: `★ ${h.ratingAverage.toFixed(1)} client rating` }] : []),
      ]
    : [];
  // Header: title on its own line, then location and experience as a quiet meta row.
  const meta: Array<{ icon: "globe" | "briefcase"; text: string }> = [
    ...(d.location ? [{ icon: "globe" as const, text: d.location }] : []),
    ...(d.yearsExperience ? [{ icon: "briefcase" as const, text: `${d.yearsExperience.replace(/\s*years?$/i, "")} years experience` }] : []),
  ];
  const otherBadges = badges.filter((b) => b.text !== "GoCWGL verified");
  const details: Array<[string, ReactNode]> = [
    ...(d.workingHours ? [["Working hours", d.workingHours] as [string, ReactNode]] : []),
    ...(d.availability ? [["Availability", d.availability] as [string, ReactNode]] : []),
    ...(d.rateCents != null ? [["Hourly rate", `${formatCentsExact(d.rateCents)} / hr`] as [string, ReactNode]] : []),
    ...(d.languages.length ? [["Languages", d.languages.join(", ")] as [string, ReactNode]] : []),
    ...(gocwgl && h.hoursTracked > 0 ? [["Hours of client work", `${Math.round(h.hoursTracked).toLocaleString()}+`] as [string, ReactNode]] : []),
    ["VA with GoCWGL since", sinceLong],
  ];
  const socials = d.socialLinks.filter((l) => l.url);
  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const progress = editor ? completeness(d) : null;

  return (
    <article className="rp" aria-label={`${d.name || "VA"} resume`}>
      <header className="rp-card rp-top">
        <div className="rp-hero">
          <div className="rp-hero__main">
            <span className="rp-hero__photo">
              <Avatar className="rp-avatar rp-avatar--hero" initials={initials} photoUrl={photoUrl} name={d.name} />
              {gocwgl && (
                <span className="rp-hero__check" title="GoCWGL verified VA" aria-label="GoCWGL verified VA">
                  <Icon name="check" size={13} />
                </span>
              )}
            </span>
            <span className="rp-hero__id">
              <h1 className="rp-name">{d.name || "Your name"}</h1>
              {d.title && <p className="rp-hero__title">{d.title}</p>}
              {(meta.length > 0 || gocwgl) && (
                <p className="rp-hero__meta">
                  {meta.map((m) => (
                    <span key={m.text}>
                      <Icon name={m.icon} size={13} /> {m.text}
                    </span>
                  ))}
                  {gocwgl && (
                    <span className="rp-hero__verified">
                      <Icon name="shield" size={13} /> GoCWGL verified
                    </span>
                  )}
                </p>
              )}
              {otherBadges.length > 0 && (
                <span className="rp-badges rp-badges--center">
                  {otherBadges.map((b) => (
                    <span key={b.text} className={`rp-badge is-${b.tone}`}>
                      {b.text}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </div>

          <div className="rp-hero__bar">
            {socials.length > 0 ? (
              <span className="rp-social" aria-label="Social media">
                {socials.map((l, i) => (
                  <a
                    key={`${l.network}-${i}`}
                    className="rp-social__btn"
                    style={{ ["--brand" as string]: brandColor(l.network) }}
                    href={href(l.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={socialLabel(l)}
                    title={socialLabel(l)}
                  >
                    <SocialIcon network={l.network} size={15} color="currentColor" />
                  </a>
                ))}
              </span>
            ) : (
              <span />
            )}
            <span className="rp-hero__cta">
              <button type="button" className="rp-btn rp-btn--primary" onClick={() => window.print()} title="Download resume as PDF">
                <Icon name="download" size={15} /> Download PDF
              </button>
            </span>
          </div>
        </div>
        {progress && (
          <div className="rp-progress">
            <span className="rp-progress__head">
              <span>Profile completeness</span>
              <strong>{progress.pct}%</strong>
            </span>
            <span className="rp-progress__track">
              <span style={{ width: `${progress.pct}%` }} />
            </span>
            <span className="rp-progress__hint">{progress.next ? `${progress.next} to reach 100%.` : "Your resume is complete."}</span>
          </div>
        )}
      </header>

      <div className="rp-grid">
        <div className="rp-col">
          {d.summary && (
            <Card title="About me">
              <p className="rp-summary">{d.summary}</p>
            </Card>
          )}

          {video && (
            <Card title="Intro video">
              <IntroVideo video={video} name={d.name} first={first} initials={initials} photoUrl={photoUrl} />
              {editor && <span className="rp-caption">Shown on your public resume page.</span>}
            </Card>
          )}


          {(jobs.length > 0 || gocwgl) && (
            <Card title="Experience">
              <ol className="rp-timeline">
                {gocwgl && (
                  <Job title={d.title || "Virtual Assistant"} company="GoCWGL · Remote" dates={`${since} – Present`} />
                )}
                {jobs.map((j, i) => (
                  <Job
                    key={i}
                    title={j.title ?? ""}
                    company={[j.company, j.location].filter(Boolean).join(", ")}
                    dates={jobDates(j)}
                    bullets={(j.bullets ?? []).filter((b) => b.trim())}
                  />
                ))}
              </ol>
            </Card>
          )}

        </div>

        <aside className="rp-col">
          <Card title="Details">
            <dl className="rp-details">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {(d.skills.length > 0 || d.tools.length > 0) && (
            <Card title="Skills & tools">
              {d.skills.length > 0 && (
                <div className="rp-chips">
                  {d.skills.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              )}
              {d.tools.length > 0 && (
                <>
                  <span className="rp-subhead">Tools</span>
                  <div className="rp-chips rp-chips--tools">
                    {d.tools.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {(socials.length > 0 || editor) && (
            <Card title="Social media">
              {socials.length > 0 ? (
                <div className="rp-docs">
                  {socials.map((l, i) => (
                    <a key={`${l.network}-${i}`} className="rp-doc" href={href(l.url)} target="_blank" rel="noreferrer">
                      <span className="rp-doc__kind rp-doc__kind--brand" style={{ ["--brand" as string]: brandColor(l.network) }}>
                        <SocialIcon network={l.network} size={17} />
                      </span>
                      <span className="rp-row__text">
                        <strong>{socialLabel(l)}</strong>
                        <span>{bare(l.url)}</span>
                      </span>
                      <Icon name="arrowRight" size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                <span className="rp-caption">Add LinkedIn, Facebook, Upwork and more in the Social media section.</span>
              )}
            </Card>
          )}

          <Card title="Portfolio & documents">
            <div className="rp-docs">
              <button type="button" className="rp-doc" onClick={() => window.print()} title="Download this resume as a PDF">
                <span className="rp-doc__kind is-pdf">PDF</span>
                <span className="rp-row__text">
                  <strong>Resume.pdf</strong>
                  <span>{updated ? `Updated ${updated}` : "Download this resume"}</span>
                </span>
                <Icon name="download" size={14} />
              </button>
              {d.website && (
                <a className="rp-doc" href={href(d.website)} target="_blank" rel="noreferrer">
                  <span className="rp-doc__kind is-url">URL</span>
                  <span className="rp-row__text">
                    <strong>Portfolio website</strong>
                    <span>{bare(d.website)}</span>
                  </span>
                  <Icon name="arrowRight" size={14} />
                </a>
              )}
              {editor && onAddLink && (
                <button type="button" className="rp-add" onClick={onAddLink}>
                  <Icon name="plus" size={14} /> Add portfolio link
                </button>
              )}
            </div>
          </Card>

          {schools.length > 0 && (
            <Card title="Education">
              <div className="rp-rows">
                {schools.map((e, i) => (
                  <div key={i} className="rp-row">
                    <span className="rp-row__text">
                      <strong>{schoolTitle(e)}</strong>
                      {e.school && schoolTitle(e) !== e.school && <span>{[e.school, e.country].filter(Boolean).join(", ")}</span>}
                    </span>
                    {schoolDates(e) && <span className="rp-row__date">{schoolDates(e)}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {certs.length > 0 && (
            <Card title="Certifications">
              <div className="rp-certs">
                {certs.map((c, i) => (
                  <div key={i} className="rp-cert">
                    <span className="rp-cert__check" aria-hidden="true">
                      <Icon name="check" size={10} />
                    </span>
                    <span className="rp-cert__body">
                      <span className="rp-cert__top">
                        <span className="rp-cert__name">{c.name}</span>
                        {c.year && <span className="rp-row__date">{c.year}</span>}
                      </span>
                      <span className="rp-cert__meta">
                        {c.kind !== "certification" && <span className="rp-cert__kind">{CERT_LABEL[c.kind] ?? c.kind}</span>}
                        {c.issuer && <span>{c.issuer}</span>}
                        {c.credentialId && <span>ID {c.credentialId}</span>}
                      </span>
                      {(c.result || c.documentId || c.url) && (
                        <span className="rp-cert__result">
                          {c.result && (
                            <span>
                              Result: <strong>{c.result}</strong>
                            </span>
                          )}
                          {c.documentId && openDocument && (
                            <button type="button" className="rp-cert__view" onClick={() => openDocument(c.documentId!)}>
                              <Icon name={c.documentType.startsWith("image/") ? "eye" : "invoice"} size={12} /> View result
                            </button>
                          )}
                          {c.url && (
                            <a className="rp-cert__view" href={href(c.url)} target="_blank" rel="noreferrer">
                              <Icon name="link" size={12} /> {c.kind === "certification" ? "Verify credential" : "View test"}
                            </a>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
      <ResumePrint d={d} memberSince={memberSince} h={h} pageUrl={pageUrl} photoUrl={photoUrl} />
    </article>
  );
}

/** A poster with a play button; the player loads only when someone presses play. */
function IntroVideo({
  video,
  name,
  first,
  initials,
  photoUrl,
}: {
  video: ResumeVideo;
  name: string;
  first: string;
  initials: string;
  photoUrl?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const { src, kind, label } = video;
  if (playing) {
    const title = `${name || "VA"} intro video`;
    return (
      <div className="rp-video">
        {kind === "file" ? (
          <video src={src} title={title} controls autoPlay playsInline preload="metadata" />
        ) : kind === "embed" ? (
          // Any other host's player, from the link or embed code the VA pasted. Sandboxed: it can play,
          // but can't navigate this page or open dialogs on it.
          <iframe
            src={src}
            title={title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <iframe
            src={`${src}${src.includes("?") ? "&" : "?"}autoplay=1`}
            title={title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    );
  }
  return (
    <button type="button" className="rp-video rp-video--poster" onClick={() => setPlaying(true)} aria-label={`Play ${first}'s intro video`}>
      <span className="rp-video__play" aria-hidden="true">
        <Icon name="play" size={22} />
      </span>
      <span className="rp-video__caption">
        <Avatar className="rp-avatar rp-avatar--sm" initials={initials} photoUrl={photoUrl} name={name} />
        <span className="rp-row__text">
          <strong>Hi, I’m {first} — quick intro</strong>
          <span>
            {name} · {label}
          </span>
        </span>
      </span>
    </button>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rp-card">
      <h2 className="rp-card__title">{title}</h2>
      {children}
    </section>
  );
}

function Job({ title, company, dates, bullets }: { title: string; company: string; dates: string; bullets?: string[] }) {
  return (
    <li className="rp-job">
      <span className="rp-job__dot" aria-hidden="true" />
      <strong className="rp-job__title">{title}</strong>
      {company && <span className="rp-job__company">{company}</span>}
      {dates && <span className="rp-job__dates">{dates}</span>}
      {bullets && bullets.length > 0 && (
        <ul className="rp-job__bullets">
          {bullets.map((b, k) => (
            <li key={k}>{b}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The round headshot: the uploaded photo, else the initials. */
function Avatar({ className, initials, photoUrl, name }: { className: string; initials: string; photoUrl?: string | null; name: string }) {
  return (
    <span className={`${className}${photoUrl ? " has-photo" : ""}`} aria-hidden={photoUrl ? undefined : true}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a user upload, served by the API
        <img src={photoUrl} alt={`${name || "VA"} headshot`} />
      ) : (
        initials
      )}
    </span>
  );
}
