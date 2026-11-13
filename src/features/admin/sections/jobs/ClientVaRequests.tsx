"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Field, FormError, Icon, LoadState, Modal, SearchBox, Textarea } from "@/components/ui";
import { requestHours, requestLoad } from "@/features/portal/components/VaRequestDetails";
import { maintenanceFeeOf } from "@/features/portal/lib/vaAgreement";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useDeclineVaRequest, useSetVaRequestStage } from "@/utils/hooks/useClientWork";
import { useJobPostings } from "@/utils/hooks/useJobPostings";
import { useVas } from "@/utils/hooks/useVas";
import { useAdmin } from "../../state/AdminContext";

type Status = VaRequestOut["status"];
export type Stage = "new" | "reviewing" | "live" | "interviewing" | "filled" | "declined" | "inactive";

export const REQUEST_STATUS: Record<Status, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "amber" },
  reviewing: { label: "In review", tone: "sky" },
  approved: { label: "Live", tone: "green" },
  posted: { label: "Live", tone: "green" },
  interviewing: { label: "Interviewing", tone: "purple" },
  matched: { label: "Filled", tone: "brand" },
  declined: { label: "Declined", tone: "red" },
  inactive: { label: "Inactive", tone: "slate" },
  closed: { label: "Inactive", tone: "slate" },
  cancelled: { label: "Cancelled by client", tone: "slate" },
};
export const STAGE_OF: Record<Status, Stage> = {
  new: "new",
  reviewing: "reviewing",
  declined: "declined",
  inactive: "inactive",
  closed: "inactive",
  cancelled: "inactive",
  approved: "live",
  posted: "live",
  interviewing: "interviewing",
  matched: "filled",
};
export const STAGES: Array<{ value: Stage; label: string; hint: string }> = [
  { value: "new", label: "New", hint: "Not looked at yet" },
  { value: "reviewing", label: "In review", hint: "Client sees it’s being reviewed" },
  { value: "live", label: "Live", hint: "In every VA’s Open jobs" },
  { value: "interviewing", label: "Interviewing", hint: "Talking to VAs" },
  { value: "filled", label: "Filled", hint: "Pick the VA who got it" },
  { value: "declined", label: "Declined", hint: "Client sees it was declined" },
  { value: "inactive", label: "Inactive", hint: "No longer active; off Open jobs" },
];
export const STAGE_NOTE: Record<Stage, string> = {
  new: "is back to New",
  reviewing: "is in review",
  live: "is live in every VA’s Open jobs",
  interviewing: "is in interviews",
  filled: "is filled",
  declined: "was declined",
  inactive: "is inactive",
};

/** What a status change does, said in the confirmation. */
export const MOVE_EFFECT: Record<Stage, string> = {
  new: "It goes back to New. The client sees it as sent, and it comes off VA Open jobs if it was live.",
  reviewing: "The client sees GoCWGL is reviewing it. If it was live, it comes off VA Open jobs.",
  live: "It’s published to every VA’s Open jobs so they can apply, and the client sees you’re finding their VA.",
  interviewing: "It stays in VA Open jobs, and the client sees you’re interviewing VAs for the role.",
  filled: "",
  declined: "",
  inactive: "It comes off VA Open jobs and becomes inactive. The client sees it’s inactive.",
};

/**
 * The confirmation for a move. Moving a filled request to Inactive asks its VA first (so they can talk to the client);
 * once they approve, the same move finishes it.
 */
export function moveCopy(r: VaRequestOut, to: Stage): { title: string; confirm: string; text: string } {
  const label = STAGES.find((x) => x.value === to)?.label ?? "";
  const client = r.clientName || "the client";
  if (to === "inactive" && r.matchedVa && r.status === "matched") {
    const va = r.matchedVa.name;
    if (!r.inactiveApprovedAt) {
      return {
        title: `Ask ${va} before moving “${r.role}” to Inactive?`,
        confirm: `Ask ${va}`,
        text: `We’ll email ${va} and show it in their VA portal so they can talk with ${client} first. Once they approve, come back here to finish the move.`,
      };
    }
    return {
      title: `Move “${r.role}” to Inactive?`,
      confirm: "Yes, move to Inactive",
      text: `${va} approved. This ends their work with ${client}: they can’t log time for them any more, and ${client} moves to their inactive clients. Past time and invoices stay.`,
    };
  }
  return { title: `Move “${r.role}” to ${label}?`, confirm: `Yes, move to ${label}`, text: MOVE_EFFECT[to] };
}

/** Moving to Inactive is waiting for the VA's approval. */
export const waitingForVa = (r: VaRequestOut) => !!r.inactiveRequestedAt && !r.inactiveApprovedAt && r.status === "matched";

/** The board's tabs: new requests first, then the same stages job postings go through, then inactive. */
export type BoardTab = "requests" | "review" | "live" | "interviewing" | "filled" | "inactive";

export const STAGE_TONE: Record<Stage, Tone> = {
  new: "amber",
  reviewing: "sky",
  live: "green",
  interviewing: "purple",
  filled: "brand",
  declined: "red",
  inactive: "slate",
};

/** Where a request really is: once it's posted, its job posting's status says (live, interviewing, filled or back in review). */
export function requestStage(r: VaRequestOut, postingStatus?: string): Stage {
  if (r.status === "approved" || r.status === "posted" || r.status === "interviewing") {
    if (postingStatus === "interviewing") return "interviewing";
    if (postingStatus === "filled") return "filled";
    if (postingStatus === "review") return "reviewing";
    return "live";
  }
  return STAGE_OF[r.status];
}

/** Label and color for a request's card or page: its real stage (a client-cancelled one says so). */
export function stageBadge(r: VaRequestOut, current: Stage): { label: string; tone: Tone } {
  if (r.status === "cancelled") return REQUEST_STATUS.cancelled;
  return { label: STAGES.find((x) => x.value === current)?.label ?? "", tone: STAGE_TONE[current] };
}

/** The tab a request shows under. */
export function requestTab(stage: Stage): BoardTab {
  return stage === "new" ? "requests" : stage === "reviewing" ? "review" : stage === "declined" || stage === "inactive" ? "inactive" : stage;
}

/**
 * Client requests as cards (in the job postings grid, or on their own): click one for its full page. The status menu moves
 * it to any stage, and the card moves to that stage's tab.
 */
export function ClientVaRequests({
  canWrite,
  requests,
  stageOf,
}: {
  canWrite: boolean;
  requests: VaRequestOut[];
  stageOf: (r: VaRequestOut) => Stage;
}) {
  const { update } = useAdmin();
  const jobs = useJobPostings().data ?? [];
  const [assignId, setAssignId] = useState("");
  const assigning = requests.find((r) => r.id === assignId) ?? null;
  const applicants = (r: VaRequestOut) => jobs.find((j) => j.id === r.jobPostingId)?.applicationCount ?? 0;

  return (
    <>
      {requests.map((r) => (
        <RequestCard
          key={r.id}
          r={r}
          current={stageOf(r)}
          applicants={applicants(r)}
          canWrite={canWrite}
          onOpen={() => update({ jobRequestId: r.id })}
          onPickVa={() => setAssignId(r.id)}
        />
      ))}
      {assigning && <AssignModal r={assigning} onClose={() => setAssignId("")} />}
    </>
  );
}

function RequestCard({
  r,
  current,
  applicants,
  canWrite,
  onOpen,
  onPickVa,
}: {
  r: VaRequestOut;
  current: Stage;
  applicants: number;
  canWrite: boolean;
  onOpen: () => void;
  onPickVa: () => void;
}) {
  const { notify } = useAdmin();
  const stage = useSetVaRequestStage();
  const st = stageBadge(r, current);
  // Every change is confirmed first (Filled picks the VA in its own dialog).
  const [confirming, setConfirming] = useState<Stage | null>(null);
  const [declining, setDeclining] = useState(false);
  const change = (to: Stage) => {
    if (to === current) return;
    if (to === "filled") return onPickVa();
    if (to === "declined") return setDeclining(true);
    if (to === "inactive" && waitingForVa(r)) return notify(`Waiting for ${r.matchedVa?.name ?? "the VA"} to approve moving “${r.role}” to Inactive.`);
    setConfirming(to);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn("job-card rq-admin-card", toneClass(st.tone))}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), onOpen())}
    >
      <span className="job-card__head">
        <span className="stack stack--2 u-grow">
          <span className="job-card__title">{r.role}</span>
          <span className="text-small">
            {r.clientName || "Client"} · {formatShort(r.createdAt)}
          </span>
        </span>
        {canWrite ? (
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <select
              className={cn("rq-status-select", toneClass(st.tone))}
              aria-label={`Status of ${r.role}`}
              value={current}
              disabled={stage.isPending}
              onChange={(e) => change(e.target.value as Stage)}
            >
              {STAGES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <Badge tone={st.tone} dot>
            {st.label}
          </Badge>
        )}
      </span>
      <span className="job-card__facts">
        <span>
          <Icon name="briefcase" size={13} /> {requestLoad(r)}
        </span>
        <span title="Monthly maintenance fee">
          <Icon name="invoice" size={13} /> {maintenanceFeeOf(r).label}
        </span>
        <span>
          <Icon name="globe" size={13} /> {requestHours(r)}
        </span>
      </span>
      {r.overview && <span className="job-card__desc vr-clamp">{r.overview}</span>}
      {stage.error ? <FormError error={stage.error} /> : null}
      {waitingForVa(r) ? (
        <span className="rq-inactive-chip is-waiting">
          <Icon name="clock" size={12} /> Waiting for {r.matchedVa?.name} to approve going inactive
        </span>
      ) : r.inactiveApprovedAt && r.status === "matched" ? (
        <span className="rq-inactive-chip is-ready">
          <Icon name="check" size={12} /> {r.matchedVa?.name} approved: move to Inactive
        </span>
      ) : null}
      <span className="rq-admin-card__foot">
        {r.matchedVa ? (
          <span className="rq-admin-card__va">
            <Avatar name={r.matchedVa.name} tone={avatarTone(r.matchedVa.id)} size="sm" /> {r.matchedVa.name}
          </span>
        ) : r.jobPostingId ? (
          <span className="ap-count">
            <Icon name="users" size={12} /> {applicants} applicant{applicants === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-tiny">Not published yet</span>
        )}
        <span className="rq-admin-card__open">
          View request <Icon name="arrowRight" size={12} />
        </span>
      </span>
      {confirming && (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title={moveCopy(r, confirming).title}
            confirmLabel={moveCopy(r, confirming).confirm}
            icon={confirming === "inactive" ? "circleX" : "arrowRight"}
            pending={stage.isPending}
            error={stage.error}
            onConfirm={() =>
              stage.mutate({ id: r.id, body: { stage: confirming } }, { onSuccess: () => (notify(`“${r.role}” ${STAGE_NOTE[confirming]}.`), setConfirming(null)) })
            }
            onClose={() => setConfirming(null)}
          >
            {moveCopy(r, confirming).text}
          </ConfirmDialog>
        </span>
      )}
      {declining && (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DeclineModal r={r} onClose={() => setDeclining(false)} />
        </span>
      )}
    </div>
  );
}

export function DeclineModal({ r, onClose }: { r: VaRequestOut; onClose: () => void }) {
  const { notify } = useAdmin();
  const decline = useDeclineVaRequest();
  const [note, setNote] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    decline.mutate({ id: r.id, note: note.trim() }, { onSuccess: () => (notify(`Declined “${r.role}”.`), onClose()) });
  };
  return (
    <Modal
      open
      width={480}
      onClose={onClose}
      onSubmit={submit}
      titleId="decline-va-request"
      kicker="CLIENT REQUEST"
      title={`Decline “${r.role}”?`}
      subtitle={`${r.clientName || "The client"} sees this in their portal, with your note.`}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger-solid" disabled={decline.isPending}>
            {decline.isPending ? "Declining…" : "Decline request"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={decline.error} />
        <Field label="Note to the client" htmlFor="dv-note" hint="Optional, but it helps: why, or what they could ask for instead.">
          <Textarea id="dv-note" rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Assign a VA yourself: the request is marked Filled and the client sees the VA's profile. */
export function AssignModal({ r, onClose }: { r: VaRequestOut; onClose: () => void }) {
  const { notify } = useAdmin();
  const stage = useSetVaRequestStage();
  const [q, setQ] = useState("");
  const vas = useVas(q.trim());
  const [picked, setPicked] = useState(r.matchedVa?.id ?? "");
  const list = (vas.data?.vas ?? []).filter((v) => v.isActive);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    const name = list.find((v) => v.id === picked)?.fullName ?? "the VA";
    stage.mutate(
      { id: r.id, body: { stage: "filled", vaId: picked } },
      { onSuccess: () => (notify(`Assigned ${name} to “${r.role}”. ${r.clientName || "The client"} can review their profile now.`), onClose()) },
    );
  };

  return (
    <Modal
      open
      width={560}
      onClose={onClose}
      onSubmit={submit}
      titleId="assign-va"
      kicker={`CLIENT REQUEST · ${(r.clientName || "CLIENT").toUpperCase()}`}
      title={`Assign a VA to “${r.role}”`}
      subtitle="The request is marked Filled. The client sees this VA and can review their profile and resume."
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!picked || stage.isPending}>
            {stage.isPending ? "Assigning…" : "Assign VA"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={stage.error} />
        <SearchBox label="Search VAs" placeholder="Search by name or skill" value={q} onChange={setQ} />
        <LoadState query={vas} loadingText="Loading VAs…" isEmpty={!list.length} empty="No VAs match.">
          <ul className="mv-list" role="listbox" aria-label="VAs">
            {list.map((v) => (
              <li key={v.id}>
                <button type="button" role="option" aria-selected={picked === v.id} className={cn("mv-list__item", picked === v.id && "is-on")} onClick={() => setPicked(v.id)}>
                  <Avatar name={v.fullName} tone={avatarTone(v.id)} size="sm" />
                  <span className="stack stack--0 u-grow">
                    <strong>{v.fullName}</strong>
                    <span className="text-tiny">{[v.headline, v.skills.slice(0, 3).join(", ")].filter(Boolean).join(" · ") || "Virtual assistant"}</span>
                  </span>
                  <span className="mv-list__meta">
                    {v.clientCount} client{v.clientCount === 1 ? "" : "s"}
                  </span>
                  {picked === v.id && <Icon name="check" size={15} />}
                </button>
              </li>
            ))}
          </ul>
        </LoadState>
      </div>
    </Modal>
  );
}
