"use client";

import { useVaAccess } from "../lib/access";
import { useState } from "react";
import { Badge, Button, FormError, Icon, IconTile, LoadState, Modal, SearchBox, Textarea } from "@/components/ui";
import type { OpenJobOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useApplyForJob, useOpenJobs, useWithdrawApplication } from "@/utils/hooks/useVaPortal";

const TYPE: Record<OpenJobOut["employmentType"], string> = { part_time: "Part-time", full_time: "Full-time", project: "Project" };

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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<OpenJobOut | null>(null);
  const q = search.trim().toLowerCase();
  const jobs = (query.data ?? []).filter((j) => !q || `${j.title} ${j.skills.join(" ")} ${j.description}`.toLowerCase().includes(q));

  return (
    <div className="page-stack">
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
                <button key={j.id} type="button" className="va-job" onClick={() => setOpen(j)}>
                  <span className="va-job__top">
                    <span className="va-job__title">{j.title}</span>
                    {j.myApplication ? (
                      <Badge tone="green" dot>
                        Applied
                      </Badge>
                    ) : (
                      rate(j) && <span className="va-job__rate">{rate(j)}</span>
                    )}
                  </span>
                  <span className="va-job__meta">
                    <Badge tone="cyan">{TYPE[j.employmentType]}</Badge>
                    {j.hoursPerWeek && (
                      <span>
                        <Icon name="clock" size={12} /> {j.hoursPerWeek} h/week
                      </span>
                    )}
                    {j.schedule && (
                      <span>
                        <Icon name="calendar" size={12} /> {j.schedule}
                      </span>
                    )}
                    {j.publishedAt && <span className="u-push-right">Posted {formatRelative(j.publishedAt)}</span>}
                  </span>
                  {j.description && <span className="va-job__desc">{j.description}</span>}
                  {j.skills.length > 0 && (
                    <span className="va-job__skills">
                      {j.skills.slice(0, 6).map((s) => (
                        <span key={s} className="tt-tag">
                          {s}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </LoadState>
      </div>
      {open && <JobDrawer job={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function JobDrawer({ job: j, onClose }: { job: OpenJobOut; onClose: () => void }) {
  const { readOnly } = useVaAccess();
  const apply = useApplyForJob();
  const withdraw = useWithdrawApplication();
  const [note, setNote] = useState("");
  const mine = j.myApplication;
  const applied = mine?.status === "applied";

  return (
    <Modal
      open
      variant="drawer"
      width={620}
      onClose={onClose}
      titleId="va-job"
      kicker={`OPEN JOB · ${TYPE[j.employmentType].toUpperCase()}`}
      title={j.title}
      subtitle={[rate(j), j.hoursPerWeek ? `${j.hoursPerWeek} h/week` : "", j.schedule].filter(Boolean).join(" · ")}
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
            <Button variant="primary" disabled={readOnly || apply.isPending} onClick={() => apply.mutate({ id: j.id, note })}>
              <Icon name="send" size={13} /> {apply.isPending ? "Applying…" : "Apply for this job"}
            </Button>
          )}
        </>
      }
    >
      <div className="stack stack--16">
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
        ) : (
          <div className="job-apply">
            <label className="field__label" htmlFor="job-note">
              Why you’re a great fit <span className="text-tiny">(optional)</span>
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
            <span className="text-tiny">GoCWGL sees your profile and resume with your application. The client’s name stays private until you’re matched.</span>
          </div>
        )}
        {j.skills.length > 0 && (
          <div className="stack stack--8">
            <span className="kicker">SKILLS</span>
            <span className="va-job__skills">
              {j.skills.map((s) => (
                <span key={s} className="tt-tag">
                  {s}
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="stack stack--8">
          <span className="kicker">ABOUT THE ROLE</span>
          <p className="va-pre">{j.description || "No description yet."}</p>
        </div>
      </div>
    </Modal>
  );
}
