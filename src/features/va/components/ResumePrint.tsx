"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import type { ResumeHighlights } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { socialLabel } from "../lib/socials";
import type { ResumeContent } from "./ResumePaper";

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const KIND: Record<string, string> = { personality: "Personality test", skills: "Skills test", other: "Other" };

/**
 * The resume as an A4 document, used only for "Download PDF" (the browser's Save as PDF). Hidden on screen.
 * Rendered straight into <body> so printing shows just this, on as many pages as it needs.
 */
export function ResumePrint({
  d,
  memberSince,
  h,
  pageUrl,
  photoUrl,
}: {
  d: ResumeContent;
  memberSince: string;
  h: ResumeHighlights | null;
  pageUrl?: string;
  photoUrl?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  // Portals need the browser's document (not available while the page is rendered on the server).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const initials =
    d.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "VA";
  const since = new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const gocwgl = d.showGocwgl && !!h;
  const jobs = d.workHistory.filter((j) => j.title || j.company);
  const schools = d.education.filter((e) => e.school || e.degree);
  const certs = [
    ...d.certifications.filter((c) => c.name),
    ...(gocwgl ? h.trainingsPassed.map((t) => ({ name: t, issuer: "GoCWGL training", year: "", result: "", kind: "certification" as const })) : []),
  ];
  // No email or phone: clients reach VAs through GoCWGL.
  const contact = [d.location, d.yearsExperience && `${d.yearsExperience.replace(/\s*years?$/i, "")} years experience`].filter(Boolean);
  const details: Array<[string, string]> = [
    ...(d.rateCents != null ? [["Hourly rate", `${formatCentsExact(d.rateCents)} / hr`] as [string, string]] : []),
    ...(d.availability ? [["Availability", d.availability] as [string, string]] : []),
    ...(d.workingHours ? [["Working hours", d.workingHours] as [string, string]] : []),
    ...(d.yearsExperience ? [["Experience", `${d.yearsExperience.replace(/\s*years?$/i, "")} years`] as [string, string]] : []),
    ["Member since", since],
  ];
  const links = [
    ...d.socialLinks.filter((l) => l.url).map((l) => ({ label: socialLabel(l), url: l.url })),
    ...(d.website ? [{ label: "Portfolio", url: d.website }] : []),
  ];
  const stats = gocwgl
    ? [
        ...(h.hoursTracked > 0 ? [{ value: `${Math.round(h.hoursTracked).toLocaleString()}+`, label: "hours of client work" }] : []),
        ...(h.ratingAverage != null ? [{ value: `${h.ratingAverage.toFixed(1)} / 5`, label: `client rating (${h.ratingCount})` }] : []),
        ...(h.activeClients > 0 ? [{ value: String(h.activeClients), label: `active client${h.activeClients === 1 ? "" : "s"}` }] : []),
        ...(h.trainingsPassed.length ? [{ value: String(h.trainingsPassed.length), label: "trainings passed" }] : []),
      ]
    : [];

  return createPortal(
    <div className="rp-print-root" aria-hidden="true">
      <article className="rpp">
        <header className="rpp-head">
          <span className="rpp-corner is-tl" aria-hidden="true" />
          <span className="rpp-corner is-br" aria-hidden="true" />
          <div className="rpp-head__id">
            <span className={`rpp-mono${photoUrl ? " has-photo" : ""}`}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- printed
                <img src={photoUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </span>
            <div>
              <span className="rpp-kicker">{"// GoCWGL · Virtual assistant profile"}</span>
              <h1 className="rpp-name">{d.name || "Your name"}</h1>
              {d.title && <p className="rpp-title">{d.title}</p>}
              {contact.length > 0 && <p className="rpp-contact">{contact.join("   •   ")}</p>}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed, not optimized */}
          <img className="rpp-logo" src={logoWordmark.src} alt="GoCWGL" />
        </header>

        {stats.length > 0 && (
          <section className="rpp-verified">
            <span className="rpp-verified__label">Verified by GoCWGL</span>
            {stats.map((s) => (
              <span key={s.label} className="rpp-stat">
                <strong>{s.value}</strong> {s.label}
              </span>
            ))}
          </section>
        )}

        <div className="rpp-body">
          <aside className="rpp-side">
            <Side title="Details">
              <dl className="rpp-dl">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Side>
            {d.skills.length > 0 && (
              <Side title="Skills">
                <ul className="rpp-list">
                  {d.skills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Side>
            )}
            {d.tools.length > 0 && (
              <Side title="Tools">
                <p className="rpp-tags">{d.tools.join(" · ")}</p>
              </Side>
            )}
            {d.languages.length > 0 && (
              <Side title="Languages">
                <ul className="rpp-list">
                  {d.languages.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </Side>
            )}
            {links.length > 0 && (
              <Side title="Online">
                <ul className="rpp-links">
                  {links.map((l) => (
                    <li key={l.url}>
                      <strong>{l.label}</strong>
                      <span>{bare(l.url)}</span>
                    </li>
                  ))}
                </ul>
              </Side>
            )}
            {schools.length > 0 && (
              <Side title="Education">
                {schools.map((e, i) => (
                  <div key={i} className="rpp-edu">
                    <strong>{e.degree || e.school}</strong>
                    {e.degree && e.school && <span>{e.school}</span>}
                    {e.year && <em>{e.year}</em>}
                  </div>
                ))}
              </Side>
            )}
          </aside>

          <main className="rpp-main">
            {d.summary && (
              <Main n={1} title="Profile">
                <p className="rpp-text">{d.summary}</p>
              </Main>
            )}

            {(jobs.length > 0 || gocwgl) && (
              <Main n={d.summary ? 2 : 1} title="Experience">
                <ol className="rpp-jobs">
                  {gocwgl && (
                    <li>
                      <div className="rpp-job__head">
                        <strong>{d.title || "Virtual Assistant"}</strong>
                        <span>{since} – Present</span>
                      </div>
                      <span className="rpp-job__co">GoCWGL · Remote</span>
                      <ul>
                        <li>Remote virtual assistant placed with GoCWGL clients; hours, ratings and trainings verified by GoCWGL.</li>
                      </ul>
                    </li>
                  )}
                  {jobs.map((j, i) => {
                    const bullets = (j.bullets ?? []).filter((b) => b.trim());
                    return (
                      <li key={i}>
                        <div className="rpp-job__head">
                          <strong>{j.title}</strong>
                          <span>{[j.start, j.end || (j.start ? "Present" : "")].filter(Boolean).join(" – ")}</span>
                        </div>
                        {(j.company || j.location) && <span className="rpp-job__co">{[j.company, j.location].filter(Boolean).join(" · ")}</span>}
                        {bullets.length > 0 && (
                          <ul>
                            {bullets.map((b, k) => (
                              <li key={k}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Main>
            )}

            {certs.length > 0 && (
              <Main n={(d.summary ? 1 : 0) + (jobs.length > 0 || gocwgl ? 1 : 0) + 1} title="Certifications & test results">
                <div className="rpp-certs">
                  {certs.map((c, i) => (
                    <div key={i} className="rpp-cert">
                      <div className="rpp-job__head">
                        <strong>{c.name}</strong>
                        <span>{c.year}</span>
                      </div>
                      <span className="rpp-cert__meta">
                        {[c.kind && c.kind !== "certification" ? KIND[c.kind] : "", c.issuer].filter(Boolean).join(" · ")}
                        {c.result ? (
                          <>
                            {" — "}
                            <b>{c.result}</b>
                          </>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </Main>
            )}
          </main>
        </div>

        <footer className="rpp-foot">
          <span className="rpp-foot__bar" aria-hidden="true" />
          <span>
            {pageUrl ? (
              <>
                Full resume{d.introVideoUrl ? " and intro video" : ""}: <strong>{bare(pageUrl)}</strong>
              </>
            ) : (
              "Resume shared through GoCWGL"
            )}
          </span>
          <span>gocwgl.com</span>
        </footer>
      </article>
    </div>,
    document.body,
  );
}

function Side({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rpp-side__block">
      <h2>{`// ${title}`}</h2>
      {children}
    </section>
  );
}

function Main({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rpp-main__block">
      <h2>
        <span className="rpp-num">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
