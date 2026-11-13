"use client";

import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, ConfirmDialog, FormError, Icon, LoadState, Textarea, type IconName } from "@/components/ui";
import { VaRequestDetails, requestHours, requestLoad } from "@/features/portal/components/VaRequestDetails";
import { maintenanceFeeOf } from "@/features/portal/lib/vaAgreement";
import { VaRequestForm } from "@/features/portal/components/VaRequestModal";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { JobPostingOut, VaRequestOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useAllVaRequests, useDeleteVaRequest, useSetVaRequestStage, useStaffUpdateVaRequest } from "@/utils/hooks/useClientWork";
import { useJobPostings } from "@/utils/hooks/useJobPostings";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { ApplicantsList } from "./ApplicantsModal";
import { AssignModal, DeclineModal, moveCopy, requestStage, STAGE_NOTE, STAGES, stageBadge, waitingForVa, type Stage } from "./ClientVaRequests";

/** Job postings › one client VA request, full page: the whole request, applicants, status, VA and job post. */
export function JobRequestPage({ id }: { id: string }) {
  const { update } = useAdmin();
  const query = useAllVaRequests();
  const r = query.data?.find((x) => x.id === id);
  return (
    <div className="page-stack">
      <div>
        <button type="button" className="vp-back" onClick={() => update({ jobRequestId: "" })}>
          <Icon name="arrowLeft" size={14} /> All job postings
        </button>
      </div>
      <LoadState query={query} loadingText="Loading request…" isEmpty={!r} empty="This request isn’t available any more.">
        {r && <Page r={r} />}
      </LoadState>
    </div>
  );
}

function Page({ r }: { r: VaRequestOut }) {
  const { notify, openClient, update } = useAdmin();
  const remove = useDeleteVaRequest();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canWrite = canWriteCrm(useMe().data);
  const posting = useJobPostings().data?.find((j) => j.id === r.jobPostingId) ?? null;
  const stage = useSetVaRequestStage();
  const saveNote = useStaffUpdateVaRequest();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState(r.teamNote);
  // Once posted, the job posting says where it really is (live, interviewing, filled).
  const current = requestStage(r, posting?.status);
  const st = stageBadge(r, current);
  const applicants = r.applicantCount ?? posting?.applicationCount ?? 0;

  // Every status change is confirmed first. Filled and Declined open their own dialogs (pick the VA / write a note).
  const [confirming, setConfirming] = useState<Stage | null>(null);
  const move = (to: Stage) => {
    if (to === current) return;
    if (to === "filled") return setAssigning(true);
    if (to === "declined") return setDeclining(true);
    if (to === "inactive" && waitingForVa(r)) return;
    setConfirming(to);
  };
  const apply = (to: Stage) =>
    stage.mutate({ id: r.id, body: { stage: to } }, { onSuccess: () => (notify(`“${r.role}” ${STAGE_NOTE[to]}.`), setConfirming(null)) });

  const stats: Array<{ icon: IconName; tone: Tone; label: string; value: string }> = [
    { icon: "users", tone: "cyan", label: "Applicants", value: r.jobPostingId ? String(applicants) : "—" },
    { icon: "clock", tone: "purple", label: "Hours", value: requestLoad(r) },
    // What GoCWGL invoices the client each month for this VA.
    { icon: "invoice", tone: "brand", label: "Maintenance fee", value: maintenanceFeeOf(r).label },
    { icon: "calendar", tone: "brand", label: "Requested", value: formatShort(r.createdAt) },
    { icon: "radio", tone: "green", label: "In Open jobs", value: posting?.publishedAt && ["live", "interviewing"].includes(posting.status) ? `Since ${formatShort(posting.publishedAt)}` : "No" },
  ];

  return (
    <>
      <section className={cn("card vp-hero jr-hero", toneClass(st.tone))}>
        <div className="vp-hero__cover" aria-hidden="true" />
        <div className="vp-hero__body">
          <span className="jr-hero__icon" aria-hidden="true">
            <Icon name="briefcase" size={26} />
          </span>
          <div className="vp-hero__main">
            <div className="vp-hero__title">
              <h2 className="vp-hero__name">{r.role}</h2>
              <Badge tone={st.tone} dot>
                {st.label}
              </Badge>
            </div>
            <p className="vp-hero__headline">
              For {r.clientName || "client"} · requested by {r.requestedByName || "the client"}
            </p>
            <ul className="vp-hero__meta">
              <li>
                <Icon name="clock" size={14} /> <span>{requestHours(r)}</span>
              </li>
              {r.reviewedByName && (
                <li>
                  <Icon name="user" size={14} /> <span>Reviewed by {r.reviewedByName}</span>
                </li>
              )}
            </ul>
          </div>
          <div className="vp-hero__actions">
            {canWrite && (
              <Button variant="primary" onClick={() => setEditing(true)}>
                <Icon name="edit" size={14} /> Edit request
              </Button>
            )}
            {canWrite && !r.matchedVa && (
              <Button variant="outline" onClick={() => setAssigning(true)}>
                <Icon name="userPlus" size={14} /> Assign a VA
              </Button>
            )}
          </div>
        </div>
        <div className="vp-stats">
          {stats.map((x) => (
            <div key={x.label} className={cn("vp-stat", toneClass(x.tone))}>
              <span className="vp-stat__icon" aria-hidden="true">
                <Icon name={x.icon} size={15} />
              </span>
              <span className="stack stack--0">
                <span className="vp-stat__label">{x.label}</span>
                <span className="vp-stat__value">{x.value}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <FormError error={stage.error ?? saveNote.error ?? remove.error} />

      <div className="vp-grid">
        <div className="vp-grid__main">
          <Card
            icon="clipboard"
            title="Request details"
            aside={
              canWrite && (
                <button type="button" className="rq-link" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={12} /> Edit
                </button>
              )
            }
          >
            <VaRequestDetails r={r} staff />
          </Card>

          <Card icon="users" title="Applicants" count={r.jobPostingId ? applicants : undefined}>
            {r.jobPostingId ? (
              <ApplicantsList
                postingId={r.jobPostingId}
                title={r.role}
                clientName={r.clientName}
                open={!["matched", "closed", "inactive", "cancelled", "declined"].includes(r.status)}
                canWrite={canWrite}
              />
            ) : (
              <p className="vp-empty">Set the request to Live to publish it in every VA’s Open jobs. Applicants show here.</p>
            )}
          </Card>
        </div>

        <aside className="vp-grid__side">
          <Card icon="gauge" title="Status">
            <StatusPanel r={r} current={current} canWrite={canWrite} busy={stage.isPending} onMove={move} />
          </Card>

          <Card icon="user" title="Client">
            <div className="rq-client">
              <Avatar name={r.clientName || "Client"} tone={avatarTone(r.contactId)} />
              <span className="stack stack--0 u-grow">
                <strong>{r.clientName || "Client"}</strong>
                <span className="text-tiny">Requested by {r.requestedByName || "the client"}</span>
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => openClient(r.contactId)}>
              Open client profile <Icon name="arrowRight" size={12} />
            </Button>
          </Card>

          <Card icon="briefcase" title="Assigned VA">
            {r.matchedVa ? (
              <div className="stack stack--10">
                <div className="mv-strip">
                  <Avatar name={r.matchedVa.name} tone={avatarTone(r.matchedVa.id)} size="sm" />
                  <span className="stack stack--0 u-grow">
                    <strong>{r.matchedVa.name}</strong>
                    <span className="text-tiny">
                      {r.matchedVa.headline || "Virtual assistant"}
                      {r.matchedAt ? ` · ${formatShort(r.matchedAt)}` : ""}
                    </span>
                  </span>
                </div>
                {r.hireNote && (
                  <div className="jr-hire-note">
                    <span className="jr-hire-note__label">
                      <Icon name="message" size={12} /> Why the client picked {r.matchedVa.name.split(" ")[0]}
                    </span>
                    <p>{r.hireNote}</p>
                  </div>
                )}
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>
                    Change VA
                  </Button>
                )}
              </div>
            ) : (
              <p className="vp-empty">No VA yet. Assign one yourself, or hire an applicant.</p>
            )}
          </Card>

          <JobPostCard posting={posting} />

          <Card icon="message" title="Note to client">
            <Textarea rows={3} maxLength={2000} value={note} disabled={!canWrite} placeholder="Shown on their request, e.g. Interviews are booked for Tuesday." onChange={(e) => setNote(e.target.value)} />
            {canWrite && note.trim() !== r.teamNote && (
              <Button size="sm" variant="primary" disabled={saveNote.isPending} onClick={() => saveNote.mutate({ id: r.id, body: { teamNote: note.trim() } }, { onSuccess: () => notify("Note saved.") })}>
                Save note
              </Button>
            )}
          </Card>

          {canWrite && (
            <section className="card vp-card jr-danger">
              <header className="vp-card__head">
                <span className="vp-card__icon" aria-hidden="true">
                  <Icon name="trash" size={14} />
                </span>
                <h3 className="vp-card__title">Delete request</h3>
              </header>
              <p className="text-small">
                Removes it from {r.clientName || "the client"}’s portal for good.
                {r.jobPostingId && r.status !== "matched" ? " Its job post leaves VA Open jobs, and applications are deleted." : ""} This can’t be undone.
              </p>
              {confirmDelete ? (
                <div className="cluster cluster--8">
                  <Button size="sm" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-solid"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(r.id, { onSuccess: () => (notify(`“${r.role}” was deleted.`), update({ jobRequestId: "" })) })}
                  >
                    {remove.isPending ? "Deleting…" : "Yes, delete it"}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash" size={13} /> Delete request
                </Button>
              )}
            </section>
          )}

          <Card icon="calendar" title="Timeline">
            <ul className="jr-timeline">
              <li>
                <b>Requested</b> {formatRelative(r.createdAt)}
              </li>
              {r.reviewedAt && (
                <li>
                  <b>Reviewed</b> {formatRelative(r.reviewedAt)}
                </li>
              )}
              {posting?.publishedAt && (
                <li>
                  <b>Published to Open jobs</b> {formatRelative(posting.publishedAt)}
                </li>
              )}
              {r.matchedAt && (
                <li>
                  <b>Filled</b> {formatRelative(r.matchedAt)}
                </li>
              )}
              <li>
                <b>Last updated</b> {formatRelative(r.updatedAt)}
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      {editing && <VaRequestForm staff edit={r} posting={posting} notify={notify} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmDialog
          title={moveCopy(r, confirming).title}
          confirmLabel={moveCopy(r, confirming).confirm}
          icon={confirming === "inactive" ? "circleX" : "arrowRight"}
          pending={stage.isPending}
          error={stage.error}
          onConfirm={() => apply(confirming)}
          onClose={() => setConfirming(null)}
        >
          {moveCopy(r, confirming).text}
        </ConfirmDialog>
      )}
      {assigning && <AssignModal r={r} onClose={() => setAssigning(false)} />}
      {declining && <DeclineModal r={r} onClose={() => setDeclining(false)} />}
    </>
  );
}

/** The job post VAs see (made from this request). */
function JobPostCard({ posting: p }: { posting: JobPostingOut | null }) {
  const rate =
    p && (p.rateMinCents != null || p.rateMaxCents != null)
      ? [p.rateMinCents, p.rateMaxCents]
          .filter((c): c is number => c != null)
          .map((c) => formatCentsExact(c))
          .join("–") + "/hr"
      : "Not set";
  return (
    <Card icon="radio" title="Job post">
      {p ? (
        <dl className="vp-details">
          <div className="vp-details__row">
            <dt>Status</dt>
            <dd>{p.status === "live" ? "Live in Open jobs" : p.status === "interviewing" ? "Interviewing" : p.status === "filled" ? "Filled" : "Off Open jobs"}</dd>
          </div>
          <div className="vp-details__row">
            <dt>Pay for the VA</dt>
            <dd>{rate}</dd>
          </div>
          <div className="vp-details__row">
            <dt>Schedule</dt>
            <dd>{p.schedule || "—"}</dd>
          </div>
          <div className="vp-details__row">
            <dt>Applicants</dt>
            <dd>{p.applicationCount ?? 0}</dd>
          </div>
        </dl>
      ) : (
        <p className="vp-empty">Not published yet. It’s made when the request goes Live.</p>
      )}
    </Card>
  );
}

function Card({ icon, title, count, aside, children }: { icon: IconName; title: string; count?: number; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card vp-card">
      <header className="vp-card__head">
        <span className="vp-card__icon" aria-hidden="true">
          <Icon name={icon} size={14} />
        </span>
        <h3 className="vp-card__title">{title}</h3>
        {count !== undefined && <span className="vp-card__count">{count}</span>}
        {aside && <span className="u-push-right">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

/** The main path a request takes; Declined and Closed end it. */
const FLOW: Stage[] = ["new", "reviewing", "live", "interviewing", "filled"];

/** Status: where the request is now, the path it takes (click a step to move it), and the ways to end it. */
function StatusPanel({
  r,
  current,
  canWrite,
  busy,
  onMove,
}: {
  r: VaRequestOut;
  current: Stage;
  canWrite: boolean;
  busy: boolean;
  onMove: (to: Stage) => void;
}) {
  const now = stageBadge(r, current);
  const at = FLOW.indexOf(current);
  const ended = at < 0 || r.status === "cancelled";
  const hint = (v: Stage) => STAGES.find((x) => x.value === v)?.hint ?? "";
  const label = (v: Stage) => STAGES.find((x) => x.value === v)?.label ?? "";
  return (
    <div className="jr-status">
      <div className={cn("jr-status__now", toneClass(now.tone))}>
        <span className="jr-status__now-dot" aria-hidden="true" />
        <span className="stack stack--2 u-grow">
          <strong>{now.label}</strong>
          <span>{r.status === "cancelled" ? "The client cancelled it. Pick a step to reopen it." : hint(current)}</span>
        </span>
      </div>
      {r.reviewedAt && r.reviewedByName && (
        <span className="jr-status__by">
          Updated {formatShort(r.reviewedAt)} by {r.reviewedByName}
        </span>
      )}

      {r.matchedVa && r.status === "matched" && r.inactiveRequestedAt && (
        <div className={cn("jr-status__ask", r.inactiveApprovedAt ? "is-ready" : "is-waiting")}>
          <Icon name={r.inactiveApprovedAt ? "check" : "clock"} size={14} />
          <span className="u-grow">
            {r.inactiveApprovedAt
              ? `${r.matchedVa.name} approved going inactive. Finish the move when you’re ready.`
              : `Waiting for ${r.matchedVa.name} to approve going inactive (asked ${formatShort(r.inactiveRequestedAt)}).`}
          </span>
          {r.inactiveApprovedAt && canWrite && (
            <Button size="sm" variant="primary" disabled={busy} onClick={() => onMove("inactive")}>
              Move to Inactive
            </Button>
          )}
        </div>
      )}

      <ol className="jr-flow" aria-label="Move to a status">
        {FLOW.map((v, i) => {
          const state = ended ? "" : i < at ? "is-done" : i === at ? "is-now" : "";
          return (
            <li key={v} className={cn("jr-flow__step", state)}>
              <button type="button" disabled={!canWrite || busy || v === current} onClick={() => onMove(v)} aria-current={v === current ? "step" : undefined}>
                <span className="jr-flow__dot" aria-hidden="true">
                  {state === "is-done" && <Icon name="check" size={10} />}
                </span>
                <span className="stack stack--0 u-grow">
                  <strong>{label(v)}</strong>
                  <span>{hint(v)}</span>
                </span>
                {canWrite && v !== current && <span className="jr-flow__go">Move here</span>}
              </button>
            </li>
          );
        })}
      </ol>

      {canWrite && (
        <div className="jr-status__end">
          <span className="jr-status__end-label">End this request</span>
          <span className="cluster cluster--6">
            <Button size="sm" variant="outline" disabled={busy || current === "declined"} onClick={() => onMove("declined")}>
              <Icon name="circleX" size={13} /> Decline
            </Button>
            <Button size="sm" variant="outline" disabled={busy || current === "inactive" || waitingForVa(r)} onClick={() => onMove("inactive")}>
              <Icon name="pause" size={13} /> Inactive
            </Button>
          </span>
        </div>
      )}
    </div>
  );
}
