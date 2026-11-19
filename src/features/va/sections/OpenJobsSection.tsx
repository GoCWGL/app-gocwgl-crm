"use client";

import { useVaAccess } from "../lib/access";
import { useState } from "react";
import { Badge, Button, FormError, Icon, IconTile, LoadState, Modal, SearchBox, Textarea } from "@/components/ui";
import type { OpenJobOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { cn } from "@/lib/utils";
import { formatCentsExact } from "@/utils/format/money";
import { useApplyForJob, useMyAgreement, useOpenJobs, useWithdrawApplication } from "@/utils/hooks/useVaPortal";
import { AgreementCard } from "../components/AgreementCard";

const TYPE: Record<OpenJobOut["employmentType"], string> = { part_time: "Part-time", full_time: "Full-time", project: "Project" };

/** VAs sign the VA agreement before they can apply (the API enforces it too). Unknown while it loads. */
function useAgreementSigned(): boolean | undefined {
  const a = useMyAgreement(useVaAccess().ready).data;
  return a ? !!a.acceptedAt : undefined;
}

function rate(j: OpenJobOut) {
  const f = (c: number) => formatCentsExact(c).replace(/\.00$/, "");
  if (j.rateMinCents && j.rateMaxCents) return `${f(j.rateMinCents)}–${f(j.rateMaxCents)}/h`;
  if (j.rateMinCents) return `From ${f(j.rateMinCents)}/h`;
  if (j.rateMaxCents) return `Up to ${f(j.rateMaxCents)}/h`;
  return "";
}

/** VA portal › Open jobs: live client roles; VAs apply, GoCWGL picks who to match with the client. */
export function OpenJobsSection() {
  const va = useVaAccess().ready;
  const query = useOpenJobs(va);
  const signed = useAgreementSigned();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<OpenJobOut | null>(null);
  const q = search.trim().toLowerCase();
  const jobs = (query.data ?? []).filter((j) => !q || `${j.title} ${j.skills.join(" ")} ${j.description}`.toLowerCase().includes(q));

  return (
    <div className="page-stack">
      {/* Not signed yet: the agreement and its sign-off sit above the jobs, so VAs can agree right here. */}
      {signed === false && <AgreementCard show="pending" />}
      <div className="card card--flat board">
        <div className="course-toolbar">
          <div className="stack stack--2">
            <h3 className="course-toolbar__title">Open jobs</h3>
            <span className="text-small">{query.data?.length ?? 0} role{query.data?.length === 1 ? "" : "s"} open right now · client names stay private until you’re matched</span>
          </div>
          <div className="course-toolbar__tools">
            <SearchBox label="Search jobs" placeholder="Search jobs or skills" value={search} onChange={setSearch} />
          </div>
        </div>
        <LoadState query={query} loadingText="Loading open jobs…">
          {jobs.length === 0 ? (
            <div className="board__empty">
              <span className="board__empty-icon tone-cyan" aria-hidden="true">
                <Icon name="briefcase" size={18} />
              </span>
              <span className="text-strong">{q ? `No jobs match “${search.trim()}”` : "No open jobs right now"}</span>
              <span className="text-small">New roles from GoCWGL clients are posted here. Check back soon.</span>
            </div>
          ) : (
            <div className="va-jobs">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} onOpen={() => setOpen(j)} />
              ))}
            </div>
          )}
        </LoadState>
      </div>
      {open && <JobDrawer job={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

const TYPE_ICON: Record<OpenJobOut["employmentType"], "clock" | "briefcase" | "folder"> = {
  part_time: "clock",
  full_time: "briefcase",
  project: "folder",
};

/** "Mon–Fri, 9:00 AM – 5:00 PM (US Mountain (Denver))" → the hours, and the time zone on its own. */
function splitSchedule(schedule: string): { hours: string; zone: string } {
  const m = schedule.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { hours: m[1], zone: m[2] } : { hours: schedule, zone: "" };
}

/** The first plain paragraph of the role (no headings or bullets), for the card's summary. */
function summaryOf(description: string): string {
  const first = parseDescription(description).find((s) => s.text.length > 0);
  return first ? first.text.join(" ") : "";
}

/** One open role in the list: what it is, the key facts, a short summary and skills; opens the full details. */
function JobCard({ job: j, onOpen }: { job: OpenJobOut; onOpen: () => void }) {
  const r = rate(j);
  const { hours, zone } = splitSchedule(j.schedule ?? "");
  const summary = summaryOf(j.description);
  const extra = j.skills.length - 4;
  return (
    <button type="button" className={cn("va-job", `is-${j.employmentType}`, j.myApplication && "is-applied")} onClick={onOpen}>
      <span className="va-job__head">
        <span className="va-job__icon" aria-hidden="true">
          <Icon name={TYPE_ICON[j.employmentType]} size={18} />
        </span>
        <span className="va-job__heading">
          <span className="va-job__kicker">{TYPE[j.employmentType]}</span>
          <span className="va-job__title">{j.title}</span>
        </span>
        {j.myApplication ? (
          <Badge tone="green" dot>
            Applied
          </Badge>
        ) : (
          r && <span className="va-job__rate">{r}</span>
        )}
      </span>

      <span className="va-job__facts">
        {j.hoursPerWeek && (
          <span className="va-job__fact">
            <Icon name="clock" size={13} /> {j.hoursPerWeek} h/week
          </span>
        )}
        {hours && (
          <span className="va-job__fact" title={j.schedule}>
            <Icon name="calendar" size={13} /> {hours}
            {zone && <em>{zone}</em>}
          </span>
        )}
      </span>

      <span className={cn("va-job__desc", !summary && "is-empty")}>{summary || "Open the role to see the details."}</span>

      {j.skills.length > 0 && (
        <span className="va-job__skills">
          {j.skills.slice(0, 4).map((s) => (
            <span key={s} className="va-job__skill">
              {s}
            </span>
          ))}
          {extra > 0 && <span className="va-job__skill is-more">+{extra}</span>}
        </span>
      )}

      <span className="va-job__foot">
        <span>{j.publishedAt ? `Posted ${formatRelative(j.publishedAt)}` : "Open now"}</span>
        <span className="va-job__cta">
          {j.myApplication ? "View application" : "View role"} <Icon name="arrowRight" size={13} />
        </span>
      </span>
    </button>
  );
}

function JobDrawer({ job: j, onClose }: { job: OpenJobOut; onClose: () => void }) {
  const { readOnly } = useVaAccess();
  const apply = useApplyForJob();
  const withdraw = useWithdrawApplication();
  const [note, setNote] = useState("");
  const signed = useAgreementSigned();
  const mine = j.myApplication;
  const applied = mine?.status === "applied";

  const facts = [
    { icon: "briefcase", label: "Type", value: TYPE[j.employmentType] },
    { icon: "clock", label: "Hours", value: j.hoursPerWeek ? `${j.hoursPerWeek} h / week` : "Flexible" },
    { icon: "dollar", label: "Rate", value: rate(j) || "On request" },
    { icon: "calendar", label: "Posted", value: j.publishedAt ? formatRelative(j.publishedAt) : "Recently" },
  ] as const;
  const sections = parseDescription(j.description);

  return (
    <Modal
      open
      className="job-modal"
      width={760}
      onClose={onClose}
      titleId="va-job"
      kicker={`OPEN JOB · ${TYPE[j.employmentType].toUpperCase()}`}
      title={j.title}
      subtitle={j.schedule || undefined}
      media={
        <IconTile tone="cyan" size="lg">
          <Icon name="briefcase" size={18} />
        </IconTile>
      }
      footer={
        <>
          {applied && !readOnly && (
            <Button variant="danger" disabled={withdraw.isPending} onClick={() => withdraw.mutate(j.id)}>
              {withdraw.isPending ? "Withdrawing…" : "Withdraw application"}
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
          {!mine && (
            <Button variant="primary" disabled={readOnly || !signed || apply.isPending} onClick={() => apply.mutate({ id: j.id, note })}>
              <Icon name="send" size={13} /> {apply.isPending ? "Applying…" : "Apply for this job"}
            </Button>
          )}
        </>
      }
    >
      <FormError error={apply.error ?? withdraw.error} />
      {mine ? (
        <div className={`job-applied is-${mine.status}`}>
          <Icon name={mine.status === "not_selected" ? "circleX" : "circleCheck"} size={20} />
          <span className="stack stack--2">
            <strong>
              {mine.status === "hired" ? "You got this job!" : mine.status === "not_selected" ? "This role went to another VA" : "You applied"}
            </strong>
            <span className="text-small">
              {mine.status === "applied"
                ? `Applied ${formatRelative(mine.appliedAt)}. GoCWGL reviews applicants and will reach out if you’re a match.`
                : `Applied ${formatRelative(mine.appliedAt)}.`}
            </span>
            {mine.note && <span className="job-applied__note">“{mine.note}”</span>}
          </span>
        </div>
      ) : signed === false ? (
        <div className="job-applied is-agreement">
          <Icon name="lock" size={20} />
          <span className="stack stack--2">
            <strong>Sign the VA agreement to apply</strong>
            <span className="text-small">
              Before you apply for client roles, please read and agree to the GoCWGL VA agreement. It’s at the top of Open jobs and on your
              dashboard.
            </span>
            <span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Icon name="clipboard" size={13} /> Read and sign the agreement
              </Button>
            </span>
          </span>
        </div>
      ) : null}

      <dl className="job-facts">
        {facts.map((f) => (
          <div key={f.label} className="job-facts__item">
            <span className="job-facts__icon" aria-hidden="true">
              <Icon name={f.icon} size={15} />
            </span>
            <span className="stack stack--2">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </span>
          </div>
        ))}
      </dl>

      {j.skills.length > 0 && (
        <section className="job-section">
          <h3 className="job-section__title">Skills</h3>
          <span className="va-job__skills">
            {j.skills.map((s) => (
              <span key={s} className="tt-tag">
                {s}
              </span>
            ))}
          </span>
        </section>
      )}

      <section className="job-section">
        <h3 className="job-section__title">About the role</h3>
        {sections.length === 0 ? (
          <p className="text-small">No description yet.</p>
        ) : (
          <div className="job-role">
            {sections.map((sec, i) => (
              <div key={i} className="job-role__block">
                {sec.heading && <h4 className="job-role__heading">{sec.heading}</h4>}
                {sec.text.length > 0 && <p className="job-role__text">{sec.text.join("\n")}</p>}
                {sec.bullets.length > 0 && (
                  <ul className="job-role__list">
                    {sec.bullets.map((b, k) => (
                      <li key={k}>
                        <Icon name="check" size={13} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {!mine && signed !== false && (
        <div className="job-apply">
          <label className="job-apply__label" htmlFor="job-note">
            <Icon name="sparkle" size={14} /> Why you’re a great fit <span className="text-tiny">(optional)</span>
          </label>
          <Textarea
            id="job-note"
            rows={3}
            maxLength={2000}
            value={note}
            disabled={readOnly}
            placeholder="e.g. 3 years running a clinic’s inbox and calendar; I’m online during US Eastern hours."
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="job-apply__hint">
            <Icon name="shield" size={12} /> GoCWGL sees your profile and resume with your application. The client’s name stays private until you’re
            matched.
          </span>
        </div>
      )}
    </Modal>
  );
}

type RoleSection = { heading: string; text: string[]; bullets: string[] };

/**
 * Job descriptions are plain text from the client's request: blocks split by a blank line,
 * each a heading line followed by text or "• " bullets. Free-form text still reads fine.
 */
function parseDescription(raw: string): RoleSection[] {
  return (raw ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const isBullet = (l: string) => /^[•\-*]\s+/.test(l);
      const heading = lines.length > 1 && !isBullet(lines[0]) && lines[0].length <= 60 ? lines[0] : "";
      const rest = heading ? lines.slice(1) : lines;
      return {
        heading,
        text: rest.filter((l) => !isBullet(l)),
        bullets: rest.filter(isBullet).map((l) => l.replace(/^[•\-*]\s+/, "")),
      };
    });
}
