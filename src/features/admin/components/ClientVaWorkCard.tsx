"use client";

import { useState } from "react";
import { Avatar, Badge, Button, FormError, Icon, Select, Textarea } from "@/components/ui";
import { isOpenProject, PRIORITY, PROJECT_STATUS, type ProjectStatus } from "@/features/portal/lib/projects";
import { avatarTone } from "@/lib/tones";
import type { ClientProjectOut, VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { requestHours, requestLoad, VaRequestDetails } from "@/features/portal/components/VaRequestDetails";
import { TaskLinkChips } from "@/features/portal/components/TaskLinks";
import { REQUEST_STATUS } from "../sections/jobs/ClientVaRequests";
import { useAdmin } from "../state/AdminContext";
import { useClientProjects, useClientVaRequests, useStaffUpdateProject } from "@/utils/hooks/useClientWork";


/**
 * Client profile › VA requests and tasks the client asked for in their portal.
 * Staff move them along; the status and note show in the client's portal.
 */
export function ClientVaWorkCard({ contactId, canEdit }: { contactId: string; canEdit: boolean }) {
  const requests = useClientVaRequests(contactId).data ?? [];
  const projects = useClientProjects(contactId).data ?? [];
  if (!requests.length && !projects.length) return null;
  const openReq = requests.filter((r) => ["new", "reviewing", "approved"].includes(r.status)).length;
  const openProj = projects.filter(isOpenProject).length;

  return (
    <div className="inset stack stack--14">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-brand" aria-hidden="true">
          <Icon name="clipboard" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">FROM THEIR PORTAL · VA REQUESTS & TASKS</span>
          <span className="text-tiny">Update the status and leave a note: the client sees both in their portal.</span>
        </span>
        {openReq + openProj > 0 && (
          <Badge tone="brand" mono>
            {openReq + openProj} OPEN
          </Badge>
        )}
      </div>

      {requests.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker kicker--sm kicker--muted">VA REQUESTS · {requests.length}</span>
          {requests.map((r) => (
            <RequestItem key={r.id} r={r} />
          ))}
        </div>
      )}
      {projects.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker kicker--sm kicker--muted">TASKS · {projects.length}</span>
          {projects.map((p) => (
            <ProjectItem key={p.id} p={p} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestItem({ r }: { r: VaRequestOut }) {
  const { goTo } = useAdmin();
  const st = REQUEST_STATUS[r.status];
  const facts = [requestLoad(r), requestHours(r)].filter(Boolean);
  return (
    <article className="cw-item">
      <div className="cw-item__head">
        <span className="stack stack--2 u-grow">
          <strong>{r.role}</strong>
          <span className="text-tiny">
            {facts.join(" · ")} · {r.requestedByName || "Client"}, {formatShort(r.createdAt)}
          </span>
        </span>
        <Badge tone={st.tone} dot>
          {st.label}
        </Badge>
      </div>
      <VaRequestDetails r={r} />
      {r.teamNote && <p className="text-small">Note to client: {r.teamNote}</p>}
      <div className="cluster">
        <span className="u-spacer" />
        <Button size="sm" variant={r.status === "new" || r.status === "reviewing" ? "primary" : "outline"} onClick={() => goTo("jobs")}>
          {r.status === "new" || r.status === "reviewing" ? "Review in Job postings" : "Open Job postings"} <Icon name="arrowRight" size={12} />
        </Button>
      </div>
    </article>
  );
}

function ProjectItem({ p, canEdit }: { p: ClientProjectOut; canEdit: boolean }) {
  const update = useStaffUpdateProject();
  const st = PROJECT_STATUS[p.status];
  return (
    <article className="cw-item">
      <div className="cw-item__head">
        <span className="stack stack--2 u-grow">
          <strong>{p.title}</strong>
          <span className="text-tiny">
            {PRIORITY[p.priority].label} priority{p.dueDate ? ` · due ${formatShort(p.dueDate)}` : ""} · {p.requestedByName || "Client"}, {formatShort(p.createdAt)}
          </span>
        </span>
        {p.va && (
          <span className="cluster cluster--6 text-small">
            <Avatar name={p.va.name} tone={avatarTone(p.va.id)} size="sm" /> {p.va.name}
          </span>
        )}
        <Badge tone={st.tone} dot>
          {st.label}
        </Badge>
      </div>
      {p.details && <p className="cw-item__details">{p.details}</p>}
      <TaskLinkChips links={p.links} />
      {canEdit ? (
        <StaffControls
          status={p.status}
          note={p.teamNote}
          options={(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((v) => ({ value: v, label: PROJECT_STATUS[v].label }))}
          pending={update.isPending}
          error={update.error}
          onSave={(status, teamNote) => update.mutate({ id: p.id, body: { status: status as ProjectStatus, teamNote } })}
        />
      ) : (
        p.teamNote && <p className="text-small">Note: {p.teamNote}</p>
      )}
    </article>
  );
}

function StaffControls({
  status,
  note,
  options,
  pending,
  error,
  onSave,
}: {
  status: string;
  note: string;
  options: Array<{ value: string; label: string }>;
  pending: boolean;
  error: unknown;
  onSave: (status: string, note: string) => void;
}) {
  const [s, setS] = useState(status);
  const [n, setN] = useState(note);
  const dirty = s !== status || n.trim() !== note;
  return (
    <div className="cw-item__staff">
      <FormError error={error} />
      <div className="cw-item__row">
        <Select size="sm" aria-label="Status" value={s} onChange={(e) => setS(e.target.value)} options={options} />
        <Textarea rows={1} aria-label="Note for the client" placeholder="Note for the client (optional)" value={n} maxLength={2000} onChange={(e) => setN(e.target.value)} />
        <Button size="sm" variant="primary" disabled={!dirty || pending} onClick={() => onSave(s, n.trim())}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
