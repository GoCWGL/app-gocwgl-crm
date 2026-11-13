"use client";

import { Avatar, Badge, Button, FormError, Icon, LoadState, Modal } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { ApplicantOut, JobPostingOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { useApplicants, useMarkJobPostingFilled } from "@/utils/hooks/useJobPostings";
import { useAdmin } from "../../state/AdminContext";

const STATUS: Record<ApplicantOut["status"], { label: string; tone: "cyan" | "green" | "slate" }> = {
  applied: { label: "Applied", tone: "cyan" },
  hired: { label: "Hired", tone: "green" },
  not_selected: { label: "Not selected", tone: "slate" },
};

/** Job postings › Applicants: the VAs who applied; hire one to fill the job (and match a client's request). */
export function ApplicantsModal({ posting: p, canWrite, onClose }: { posting: JobPostingOut; canWrite: boolean; onClose: () => void }) {
  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      titleId="job-applicants"
      kicker="APPLICANTS"
      title={p.title}
      subtitle={p.client ? `For ${p.client.company || p.client.name}. Hiring someone fills the job and shows them to the client as their matched VA.` : "Hiring someone fills the job."}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <ApplicantsList postingId={p.id} title={p.title} clientName={p.client ? p.client.company || p.client.name : ""} open={p.status !== "filled"} canWrite={canWrite} onHired={onClose} />
    </Modal>
  );
}

/** The applicants for a job, with View profile and Hire. */
export function ApplicantsList({
  postingId,
  title,
  clientName,
  open,
  canWrite,
  onHired,
}: {
  postingId: string;
  title: string;
  clientName: string;
  open: boolean;
  canWrite: boolean;
  onHired?: () => void;
}) {
  const { notify, update } = useAdmin();
  const query = useApplicants(postingId);
  const fill = useMarkJobPostingFilled();
  const list = query.data ?? [];

  const hire = (a: ApplicantOut) => {
    if (!window.confirm(`Hire ${a.name} for “${title}”? The job is marked filled${clientName ? ` and ${clientName} sees ${a.name.split(" ")[0]} as their matched VA` : ""}.`)) return;
    fill.mutate({ id: postingId, vaId: a.vaId }, { onSuccess: () => (notify(`${a.name} was hired for “${title}”.`), onHired?.()) });
  };

  return (
    <div className="stack stack--12">
      <FormError error={fill.error} />
      <LoadState query={query} loadingText="Loading applicants…" isEmpty={!list.length} empty="No one has applied yet. VAs see this job in their Open jobs." inline>
        <ul className="ap-list">
          {list.map((a) => (
            <li key={a.vaId} className={`ap-item is-${a.status}`}>
              <div className="ap-item__head">
                <Avatar name={a.name} tone={avatarTone(a.vaId)} />
                <span className="stack stack--0 u-grow">
                  <strong>{a.name}</strong>
                  <span className="text-tiny">{[a.headline, a.country].filter(Boolean).join(" · ") || "Virtual assistant"}</span>
                </span>
                <Badge tone={STATUS[a.status].tone} dot>
                  {STATUS[a.status].label}
                </Badge>
              </div>
              {a.skills.length > 0 && (
                <div className="vp-skills">
                  {a.skills.map((s) => (
                    <span key={s} className="vp-skill">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {a.note && <p className="ap-item__note">“{a.note}”</p>}
              <div className="ap-item__foot">
                <span className="text-tiny">Applied {formatRelative(a.appliedAt)}</span>
                <span className="u-spacer" />
                <Button size="sm" variant="outline" onClick={() => update({ tab: "vas", vaFullId: a.vaId })}>
                  View profile
                </Button>
                {canWrite && open && (
                  <Button size="sm" variant="primary" disabled={fill.isPending} onClick={() => hire(a)}>
                    <Icon name="check" size={13} /> Hire
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </LoadState>
    </div>
  );
}
