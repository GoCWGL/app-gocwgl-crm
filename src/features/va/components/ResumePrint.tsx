"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import type { ResumeHighlights } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { hasSchool, jobDates, schoolDates, schoolTitle } from "../lib/resumeFormat";
import { socialLabel } from "../lib/socials";
import type { ResumeContent } from "./ResumePaper";

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const KIND: Record<string, string> = { personality: "Personality test", skills: "Skills test", other: "Other" };

/**
 * The resume as a one-page A4 document, used only for "Download PDF" (the browser's Save as PDF). Hidden on screen.
 * Rendered straight into <body> so printing shows just this.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  // Portals need the browser's document (not available while the page is rendered on the server).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  // Right before printing (the Download PDF button, or Ctrl/Cmd+P), fit it on one page.
  useEffect(() => {
    const fit = () => rootRef.current && articleRef.current && fitOnePage(rootRef.current, articleRef.current);
    window.addEventListener("beforeprint", fit);
    return () => window.removeEventListener("beforeprint", fit);
  }, []);
  if (!mounted) return null;

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
  const jobs = d.workHistory.filter((j) => j.title || j.company);
  const schools = d.education.filter(hasSchool);
  const certs = [
    ...d.certifications.filter((c) => c.name),
    ...(gocwgl ? h.trainingsPassed.map((t) => ({ name: t, issuer: "GoCWGL training", year: "", result: "", kind: "certification" as const, url: "", credentialId: "" })) : []),
  ];
  // No email or phone: clients reach VAs through GoCWGL.
  const contact = [d.location, d.yearsExperience && `${d.yearsExperience.replace(/\s*years?$/i, "")} years experience`].filter(Boolean) as string[];
  const details: Array<[string, string]> = [
    ...(d.rateCents != null ? [["Hourly rate", `${formatCentsExact(d.rateCents)} / hr`] as [string, string]] : []),
    ...(d.availability ? [["Availability", d.availability] as [string, string]] : []),
    ...(d.workingHours ? [["Working hours", d.workingHours] as [string, string]] : []),
    ...(d.yearsExperience ? [["Experience", `${d.yearsExperience.replace(/\s*years?$/i, "")} years`] as [string, string]] : []),
    ["VA with GoCWGL since", sinceLong],
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
    <div className="rp-print-root" aria-hidden="true" ref={rootRef}>
      {/* One A4 sheet: longer resumes are scaled down to fit it (see fitOnePage), never spread over a 2nd page. */}
      <div className="rpp-sheet">
        <article className="rpp" ref={articleRef}>
          <header className="rpp-head">
            <span className={`rpp-photo${photoUrl ? " has-photo" : ""}`}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- printed
                <img src={photoUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </span>
            <div className="rpp-head__text">
              <h1 className="rpp-name">{d.name || "Your name"}</h1>
              {d.title && <p className="rpp-title">{d.title}</p>}
              {contact.length > 0 && (
                <p className="rpp-contact">
                  {contact.map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                </p>
              )}
            </div>
            <div className="rpp-head__brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- printed, not optimized */}
              <img className="rpp-logo" src={logoWordmark.src} alt="GoCWGL" />
              {gocwgl && <span className="rpp-badge">Verified VA</span>}
            </div>
          </header>

          {stats.length > 0 && (
            <section className="rpp-verified">
              <span className="rpp-verified__label">Verified by GoCWGL</span>
              {stats.map((s) => (
                <span key={s.label} className="rpp-stat">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </span>
              ))}
            </section>
          )}

          <div className="rpp-body">
            <aside className="rpp-side">
              <Block title="Details">
                <dl className="rpp-dl">
                  {details.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Block>
              {d.skills.length > 0 && (
                <Block title="Skills">
                  <ul className="rpp-chips">
                    {d.skills.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </Block>
              )}
              {d.tools.length > 0 && (
                <Block title="Tools">
                  <ul className="rpp-chips">
                    {d.tools.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </Block>
              )}
              {d.languages.length > 0 && (
                <Block title="Languages">
                  <ul className="rpp-list">
                    {d.languages.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </Block>
              )}
              {schools.length > 0 && (
                <Block title="Education">
                  {schools.map((e, i) => (
                    <div key={i} className="rpp-edu">
                      <strong>{schoolTitle(e)}</strong>
                      {e.school && schoolTitle(e) !== e.school && <span>{[e.school, e.country].filter(Boolean).join(", ")}</span>}
                      {schoolDates(e) && <em>{schoolDates(e)}</em>}
                    </div>
                  ))}
                </Block>
              )}
              {links.length > 0 && (
                <Block title="Online">
                  <ul className="rpp-links">
                    {links.map((l) => (
                      <li key={l.url}>
                        <strong>{l.label}</strong>
                        <span>{bare(l.url)}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </aside>

            <main className="rpp-main">
              {d.summary && (
                <Block title="Profile">
                  <p className="rpp-text">{d.summary}</p>
                </Block>
              )}

              {(jobs.length > 0 || gocwgl) && (
                <Block title="Experience">
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
                            <span>{jobDates(j)}</span>
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
                </Block>
              )}

              {certs.length > 0 && (
                <Block title="Certifications & test results">
                  <div className="rpp-certs">
                    {certs.map((c, i) => (
                      <div key={i} className="rpp-cert">
                        <div className="rpp-job__head">
                          <strong>{c.name}</strong>
                          <span>{c.year}</span>
                        </div>
                        <span className="rpp-cert__meta">
                          {[c.kind && c.kind !== "certification" ? KIND[c.kind] : "", c.issuer, c.credentialId && `ID ${c.credentialId}`].filter(Boolean).join(" · ")}
                          {c.result ? (
                            <>
                              {" · "}
                              <b>{c.result}</b>
                            </>
                          ) : null}
                        </span>
                        {c.url && <span className="rpp-cert__link">{bare(c.url)}</span>}
                      </div>
                    ))}
                  </div>
                </Block>
              )}
            </main>
          </div>

          <footer className="rpp-foot">
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
      </div>
    </div>,
    document.body,
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rpp-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const MM = 96 / 25.4; // CSS px per mm
const PAGE_W = 210;
const PAGE_H = 296.5; // the sheet's height (a hair under A4, see .rpp-sheet)
/** Smallest scale used: below it text gets too small to read; anything longer is cut at the page edge. */
const MIN_SCALE = 0.62;

/**
 * Fit the resume on one A4 page. If it's taller than the page, it's laid out a little wider and scaled down evenly
 * (wider text wraps less, so it needs less shrinking). Runs right before printing, while the layout is measurable.
 */
function fitOnePage(root: HTMLElement, article: HTMLElement) {
  const before = root.style.cssText;
  // Laid out off screen (it's display:none until print styles apply) so its size can be measured.
  root.style.cssText = "display:block;position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
  const heightAt = (scale: number) => {
    article.style.width = `${PAGE_W / scale}mm`;
    article.style.minHeight = "0";
    return article.offsetHeight * scale;
  };
  let scale = 1;
  while (scale > MIN_SCALE && heightAt(scale) > PAGE_H * MM) scale = Math.max(MIN_SCALE, scale - 0.02);
  article.style.width = `${PAGE_W / scale}mm`;
  article.style.minHeight = `${PAGE_H / scale}mm`;
  article.style.transform = scale < 1 ? `scale(${scale})` : "";
  root.style.cssText = before;
}
