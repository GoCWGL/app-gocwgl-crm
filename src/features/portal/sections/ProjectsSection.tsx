"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, FormError, Icon, Input, LoadState, Modal, SegmentedControl, Select, StatGrid, Textarea } from "@/components/ui";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ClientProjectOut, TeamVa } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useProjects, useRequestProject, useUpdateProject, useVaTeam } from "@/utils/hooks/useClientWork";
import { isOpenProject, PRIORITY, PROJECT_FLOW, PROJECT_STATUS, type ProjectPriority } from "../lib/projects";
import { LinkInputs, TaskLinkChips } from "../components/TaskLinks";
import { usePortal } from "../state/PortalContext";

type View = "open" | "done" | "cancelled";

/** Client portal › My VA team › Tasks: request a task, pick the VA for it, and follow its status. */
export function ProjectsSection() {
  const { readOnly } = usePortal();
  const projects = useProjects();
  const team = useVaTeam();
  const [view, setView] = useState<View>("open");
  const [requesting, setRequesting] = useState(false);
  const all = projects.data ?? [];
  const open = all.filter(isOpenProject);
  const done = all.filter((p) => p.status === "done");
  const cancelled = all.filter((p) => p.status === "cancelled");
  const shown = view === "open" ? open : view === "done" ? done : cancelled;

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Requested", value: String(all.filter((p) => p.status === "requested").length), tone: "sky" },
          { label: "In progress", value: String(all.filter((p) => p.status === "in_progress" || p.status === "review").length), tone: "brand" },
          { label: "Done", value: String(done.length), tone: "green" },
        ]}
      />

      <div className="cp-toolbar">
        <SegmentedControl
          label="Tasks"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: "Open", count: open.length },
            { value: "done", label: "Done", count: done.length },
            { value: "cancelled", label: "Cancelled", count: cancelled.length },
          ]}
        />
        <span className="u-spacer" />
        {!readOnly && (
          <Button variant="primary" onClick={() => setRequesting(true)}>
            <Icon name="plus" size={14} /> Request a task
          </Button>
        )}
      </div>

      <LoadState
        query={projects}
        loadingText="Loading your tasks…"
        isEmpty={!shown.length}
        empty={
          view === "open"
            ? "No open tasks. Request one and pick the VA you’d like on it, and GoCWGL takes it from there."
            : view === "done"
              ? "No finished tasks yet."
              : "No cancelled tasks."
        }
      >
        <div className="tk-grid">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} team={team.data ?? []} />
          ))}
        </div>
      </LoadState>

      {requesting && <RequestModal team={team.data ?? []} onClose={() => setRequesting(false)} />}
    </div>
  );
}

function ProjectCard({ p, team }: { p: ClientProjectOut; team: TeamVa[] }) {
  const { readOnly, notify } = usePortal();
  const update = useUpdateProject();
  const [more, setMore] = useState(false);
  const step = PROJECT_FLOW.indexOf(p.status);
  const canEdit = !readOnly && isOpenProject(p);
  const overdue = !!p.dueDate && isOpenProject(p) && p.dueDate < new Date().toISOString().slice(0, 10);
  const long = p.details.length > 180 || p.details.split("\n").length > 3;

  return (
    <article className={cn("tk-card", `is-${p.status}`)}>
      <header className="tk-card__head">
        <span className={cn("tk-status", toneClass(PROJECT_STATUS[p.status].tone))}>
          <span className="tk-status__dot" aria-hidden="true" />
          {PROJECT_STATUS[p.status].label}
        </span>
        {p.priority !== "normal" && (
          <span className={cn("tk-chip", toneClass(PRIORITY[p.priority].tone))}>
            <Icon name="bolt" size={11} /> {PRIORITY[p.priority].label}
          </span>
        )}
        <span className="u-spacer" />
        {p.dueDate && (
          <span className={cn("tk-due", overdue && "is-late")}>
            <Icon name="clock" size={12} /> {overdue ? "Overdue · " : "Due "}
            {formatShort(p.dueDate)}
          </span>
        )}
      </header>

      <h3 className="tk-card__title">{p.title}</h3>
      <span className="tk-card__meta">
        Requested {formatShort(p.createdAt)}
        {p.requestedByName ? ` by ${p.requestedByName}` : ""}
        {p.completedAt && ` · finished ${formatShort(p.completedAt)}`}
      </span>

      {p.status !== "cancelled" && (
        <ol className="rq-steps tk-card__steps" aria-label="Progress">
          {PROJECT_FLOW.map((s, i) => (
            <li key={s} className={cn(i < step && "is-done", i === step && "is-now", p.status === "done" && "is-done")}>
              <span className="rq-steps__dot" aria-hidden="true">
                {(i < step || p.status === "done") && <Icon name="check" size={9} />}
              </span>
              <span className="rq-steps__label">{PROJECT_STATUS[s].label}</span>
            </li>
          ))}
        </ol>
      )}

      {p.details && (
        <div className="tk-card__details">
          <p className={cn(!more && "vr-clamp")}>{p.details}</p>
          {long && (
            <button type="button" className="rq-link" onClick={() => setMore((m) => !m)}>
              {more ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
      <TaskLinkChips links={p.links} />
      {p.teamNote && (
        <p className="rq-card__note">
          <Icon name="message" size={13} />
          <span>
            <b>GoCWGL:</b> {p.teamNote}
          </span>
        </p>
      )}

      <footer className="tk-card__foot">
        <span className="tk-card__va">
          {p.va ? (
            <>
              <Avatar name={p.va.name} tone={avatarTone(p.va.id)} size="sm" />
              <span className="stack stack--0">
                <span className="tk-card__va-label">Assigned VA</span>
                <strong>{p.va.name}</strong>
              </span>
            </>
          ) : (
            <span className="tk-card__va-label">GoCWGL is picking a VA</span>
          )}
        </span>
        {canEdit && (
          <span className="cluster cluster--8">
            <Select
              size="sm"
              aria-label="VA on this task"
              value={p.va?.id ?? ""}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ id: p.id, body: { vaId: e.target.value || null } }, { onSuccess: () => notify("VA updated.") })}
              options={[{ value: "", label: "Let GoCWGL choose" }, ...team.map((v) => ({ value: v.vaId, label: v.name }))]}
            />
            {p.status === "requested" && (
              <button
                type="button"
                className="rq-link rq-link--danger"
                disabled={update.isPending}
                onClick={() => {
                  if (window.confirm(`Cancel “${p.title}”?`)) update.mutate({ id: p.id, body: { cancel: true } }, { onSuccess: () => notify("Request cancelled.") });
                }}
              >
                Cancel
              </button>
            )}
          </span>
        )}
      </footer>
      <FormError error={update.error} />
    </article>
  );
}

function RequestModal({ team, onClose }: { team: TeamVa[]; onClose: () => void }) {
  const { notify } = usePortal();
  const request = useRequestProject();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [vaId, setVaId] = useState(team.length === 1 ? team[0].vaId : "");
  const [priority, setPriority] = useState<ProjectPriority>("normal");
  const [dueDate, setDueDate] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    request.mutate(
      { title: title.trim(), details: details.trim(), links: links.map((l) => l.trim()).filter(Boolean), vaId: vaId || null, priority, dueDate: dueDate || null },
      {
        onSuccess: () => {
          notify("Task requested. GoCWGL will confirm it with your VA.");
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      width={640}
      onClose={onClose}
      onSubmit={submit}
      titleId="request-project"
      title="Request a task"
      subtitle="Tell us what you need and who you’d like on it. Your VA sees everything you add here."
      footer={
        <>
          <span className="vrf-foot">Fields marked * are required.</span>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || request.isPending}>
            {request.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="vrf">
        <FormError error={request.error} />
        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Task</h3>
            <p>What needs doing, and what done looks like.</p>
          </header>
          <div className="vrf-section__body">
            <Field label="Title" htmlFor="pj-title" required>
              <Input id="pj-title" value={title} maxLength={160} placeholder="e.g. Clean up and tag our CRM contacts" onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="Details" htmlFor="pj-details">
              <Textarea
                id="pj-details"
                rows={5}
                value={details}
                maxLength={5000}
                placeholder="Steps, examples, logins they’ll need (shared safely), anything that helps."
                onChange={(e) => setDetails(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Links (optional)</h3>
            <p>Docs, folders, examples or recordings your VA should open.</p>
          </header>
          <div className="vrf-section__body">
            <LinkInputs value={links} onChange={setLinks} idPrefix="pj-link" />
          </div>
        </section>

        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Who and when</h3>
            <p>Pick the VA, how urgent it is, and when you need it.</p>
          </header>
          <div className="vrf-section__body">
            <Field label="Assign a VA" htmlFor="pj-va">
              <Select
                id="pj-va"
                value={vaId}
                onChange={(e) => setVaId(e.target.value)}
                options={[{ value: "", label: "Let GoCWGL choose" }, ...team.map((v) => ({ value: v.vaId, label: v.name + (v.headline ? ` — ${v.headline}` : "") }))]}
              />
            </Field>
            <div className="vrf-grid vrf-grid--2">
              <Field label="Priority">
                <SegmentedControl
                  label="Priority"
                  size="sm"
                  value={priority}
                  onChange={setPriority}
                  options={(["low", "normal", "high"] as const).map((v) => ({ value: v, label: PRIORITY[v].label }))}
                />
              </Field>
              <Field label="Due date" htmlFor="pj-due">
                <Input id="pj-due" type="date" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
