"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Avatar, Button, ConfirmDialog, Field, FormError, Icon, Input, LoadState, Modal, SegmentedControl, Textarea } from "@/components/ui";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ClientProjectOut, TeamVa } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useSession } from "@/utils/auth/session";
import { useMarkProjectRead, usePostProjectMessage, useProjectMessages, useProjects, useRequestProject, useUpdateProject, useVaTeam } from "@/utils/hooks/useClientWork";
import { allReadAt, assigneeDetail, assigneeLabel, isOpenProject, PRIORITY, PROJECT_STATUS, vaNames, type ProjectPriority } from "../lib/projects";
import { assignmentOf, VaAssign, type VaAssignment } from "../components/VaPicker";
import { LinkInputs } from "../components/TaskLinks";
import { TaskConversation, UnreadMark } from "../components/TaskConversation";
import { TaskBar, TaskFilter, TaskSearch, TaskTabs, taskText } from "../components/TaskFilters";
import { WorkEmpty } from "../components/WorkEmpty";
import { isTaskOverdue, TaskSheet, TaskStatus } from "../components/TaskSheet";
import { usePortal } from "../state/PortalContext";

type View = "open" | "done" | "cancelled";

/**
 * Client portal › Tasks & projects › Tasks: request a task, pick the VAs for it (one or several), and follow its status.
 * The request form opens from the page banner (Tasks & projects owns `requesting`) or from an empty list.
 */
export function ProjectsSection({ requesting, onRequest }: { requesting: boolean; onRequest: (open: boolean) => void }) {
  const { readOnly } = usePortal();
  const projects = useProjects();
  const team = useVaTeam();
  const [view, setView] = useState<View>("open");
  const [openId, setOpenId] = useState("");
  const [search, setSearch] = useState("");
  const [vaFilter, setVaFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "due">("newest");
  const everything = projects.data ?? [];
  const opened = everything.find((p) => p.id === openId) ?? null;
  // The VAs on their tasks, for the VA filter (A–Z).
  const vas = [...new Map(everything.flatMap((p) => p.vas).map((v) => [v.id, v])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const q = search.trim().toLowerCase();
  const all = everything.filter(
    (p) =>
      (!vaFilter || (vaFilter === "none" ? !p.vas.length : p.vas.some((v) => v.id === vaFilter))) &&
      (!q || taskText(p.title, p.details, p.vas.map((v) => v.name).join(" "), p.requestedByName).includes(q)),
  );
  const open = all.filter(isOpenProject);
  const done = all.filter((p) => p.status === "done");
  const cancelled = all.filter((p) => p.status === "cancelled");
  const shown = (view === "open" ? open : view === "done" ? done : cancelled)
    .slice()
    .sort((a, b) =>
      sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.createdAt.localeCompare(a.createdAt),
    );

  return (
    <div className="page-stack">
      <TaskBar
        top={
          <>
            <TaskTabs
              value={view}
              onChange={setView}
              options={[
                { value: "open", label: "Open", count: open.length },
                { value: "done", label: "Done", count: done.length },
                { value: "cancelled", label: "Cancelled", count: cancelled.length },
              ]}
            />
            <span className="u-spacer" />
            <TaskSearch value={search} onChange={setSearch} placeholder="Search tasks or details" />
          </>
        }
        filters={
          <>
            <TaskFilter
              icon="user"
              label="VA"
              value={vaFilter}
              onChange={setVaFilter}
              active={!!vaFilter}
              options={[
                { value: "", label: "Any VA" },
                ...vas.map((v) => ({ value: v.id, label: v.name })),
                { value: "none", label: "Not assigned yet" },
              ]}
            />
            <span className="u-spacer" />
            <TaskFilter
              icon="chart"
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "due", label: "Due soonest" },
              ]}
            />
            {(vaFilter || search) && (
              <button
                type="button"
                className="tk-bar__clear"
                onClick={() => {
                  setVaFilter("");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            )}
          </>
        }
      />

      <LoadState
        query={projects}
        loadingText="Loading your tasks…"
        isEmpty={!shown.length}
        empty={
          q || vaFilter ? (
            <WorkEmpty icon="search" title="No tasks match these filters" text="Try another search or VA." />
          ) : view === "open" ? (
            <WorkEmpty
              icon="clipboard"
              title="No open tasks"
              text="Request a task, pick the VA you’d like on it, and follow it here until it’s done."
              action={!readOnly ? { label: "Request a task", onClick: () => onRequest(true) } : undefined}
            />
          ) : view === "done" ? (
            <WorkEmpty icon="circleCheck" title="No finished tasks yet" text="Tasks your VAs complete show up here." />
          ) : (
            <WorkEmpty icon="close" title="No cancelled tasks" text="Requests you cancel show up here." />
          )
        }
      >
        <div className="card tk-list" role="table" aria-label="Tasks">
          <div className="tk-list__head" role="row">
            <span role="columnheader">Task</span>
            <span role="columnheader">Assigned to</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Due</span>
            <span role="columnheader" aria-label="Open" />
          </div>
          {shown.map((p) => (
            <ProjectRow key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
          ))}
        </div>
      </LoadState>

      {opened && <ProjectDetails p={opened} team={team.data ?? []} onClose={() => setOpenId("")} />}

      {requesting && <RequestModal team={team.data ?? []} onClose={() => onRequest(false)} />}
    </div>
  );
}

/** One task in the list; clicking it (or Open task) opens the full details. */
function ProjectRow({ p, onOpen }: { p: ClientProjectOut; onOpen: () => void }) {
  const overdue = isTaskOverdue(p);
  return (
    <div
      className={cn("tk-row", `is-${p.status}`, (p.unreadCount ?? 0) > 0 && "has-unread")}
      role="row"
      tabIndex={0}
      aria-label={`${p.title}, ${PROJECT_STATUS[p.status].label}. Open details`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="tk-row__main" role="cell">
        <span className="tk-row__title">
          {p.title}
          {p.priority !== "normal" && (
            <span className={cn("tk-chip", toneClass(PRIORITY[p.priority].tone))}>
              <Icon name="bolt" size={11} /> {PRIORITY[p.priority].label}
            </span>
          )}
          {(p.unreadCount ?? 0) > 0 && <UnreadMark count={p.unreadCount ?? 0} />}
        </span>
        <span className="tk-row__sub">
          {p.details ? p.details.split("\n")[0] : `Requested ${formatShort(p.createdAt)}`}
          {p.links.length > 0 && (
            <span className="tk-row__links">
              <Icon name="link" size={11} /> {p.links.length}
            </span>
          )}
          {(p.messageCount ?? 0) > 0 && (
            <span className="tk-row__msgs">
              <Icon name="message" size={11} /> {p.messageCount}
            </span>
          )}
        </span>
      </span>
      <span className="tk-row__client" role="cell">
        {p.vas.length ? (
          <span className="tk-avatars" title={assigneeDetail(p.vas)}>
            <span className="tk-avatars__stack">
              {p.vas.slice(0, 3).map((v) => (
                <Avatar key={v.id} name={v.name} tone={avatarTone(v.id)} size="sm" />
              ))}
            </span>
            <span className="tk-avatars__names">{assigneeLabel(p.vas)}</span>
          </span>
        ) : (
          <span className="tk-row__muted">GoCWGL is picking</span>
        )}
      </span>
      <span role="cell">
        <TaskStatus status={p.status} />
      </span>
      <span className={cn("tk-row__due", overdue && "is-late")} role="cell">
        {p.dueDate ? (overdue ? `Overdue · ${formatShort(p.dueDate)}` : formatShort(p.dueDate)) : "No due date"}
      </span>
      <span className="tk-row__action" role="cell">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Icon name="eye" size={12} /> Open task
        </Button>
        <Icon name="chevronRight" size={14} className="tk-row__chev" />
      </span>
    </div>
  );
}

/** The full task in a pop-up: what was asked, every link, the VAs on it (changeable while open) and cancelling a request. */
function ProjectDetails({ p, team, onClose }: { p: ClientProjectOut; team: TeamVa[]; onClose: () => void }) {
  const { readOnly, notify } = usePortal();
  const update = useUpdateProject();
  const [cancelling, setCancelling] = useState(false);
  const messages = useProjectMessages(p.id);
  const { viewAsClientId } = useSession();
  // Opening the task (or a new message arriving while it's open) reads the conversation. GoCWGL viewing as the
  // client doesn't (the server ignores it), so the client still sees the mark.
  const { mutate: markRead } = useMarkProjectRead();
  const unread = p.unreadCount ?? 0;
  useEffect(() => {
    if (unread > 0 && !viewAsClientId) markRead(p.id);
  }, [p.id, unread, viewAsClientId, markRead, messages.data?.length]);
  const post = usePostProjectMessage();
  const canEdit = !readOnly && isOpenProject(p);

  const actions = canEdit ? (
    <div className="tk-sheet__row">
      <VaAssign
        team={team}
        idPrefix="pj-edit"
        value={assignmentOf(p.vas)}
        disabled={update.isPending}
        onChange={(next) =>
          update.mutate({ id: p.id, body: { mainVaId: next.main, backupVaIds: next.backups } }, { onSuccess: () => notify("VAs on this task updated.") })
        }
      />
      {p.status === "requested" && (
        <Button variant="danger" disabled={update.isPending} onClick={() => (update.reset(), setCancelling(true))}>
          Cancel request
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <Modal
      open
      width={1080}
      onClose={onClose}
      titleId="client-task"
      kicker="YOUR TASK REQUEST"
      title={p.title}
      footer={
        <>
          <span className="text-small">{p.vas.length > 1 ? "Every VA on it sees" : "Your VA sees"} exactly what’s here. Status updates show every 30 seconds.</span>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        {!cancelling && <FormError error={update.error} />}
        <TaskSheet
          t={p}
          people={{
            icon: "user",
            label: p.vas.length > 1 ? "Main VA and backups" : "Assigned VA",
            value: assigneeDetail(p.vas),
          }}
          actions={actions}
          emptyDetails="You didn’t add details to this request."
          conversation={
            <TaskConversation
              side="client"
              otherName={p.vas.length > 1 ? "your VAs" : (p.vas[0]?.name ?? "your VA")}
              otherPlural={p.vas.length > 1}
              vaName={p.vas.length ? vaNames(p.vas) : "your VA"}
              otherReadAt={allReadAt(p.vas)}
              messages={messages}
              send={(body, done) => post.mutate({ id: p.id, body }, { onSuccess: done })}
              sending={post.isPending}
              sendError={post.error}
              closed={p.status === "cancelled"}
              readOnly={readOnly}
              staffViewing={!!viewAsClientId}
            />
          }
        />
      </div>
      {cancelling && (
        <ConfirmDialog
          title="Cancel this task request?"
          confirmLabel="Yes, cancel it"
          icon="close"
          pending={update.isPending}
          error={update.error}
          onClose={() => setCancelling(false)}
          onConfirm={() =>
            update.mutate(
              { id: p.id, body: { cancel: true } },
              {
                onSuccess: () => {
                  notify("Request cancelled.");
                  setCancelling(false);
                  onClose();
                },
              },
            )
          }
        >
          “{p.title}” is cancelled and moves to the Cancelled tab. {p.vas.length ? `${vaNames(p.vas)} won’t work on it.` : ""}
        </ConfirmDialog>
      )}
    </Modal>
  );
}

function RequestModal({ team, onClose }: { team: TeamVa[]; onClose: () => void }) {
  const { notify } = usePortal();
  const request = useRequestProject();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [assign, setAssign] = useState<VaAssignment>({ main: team.length === 1 ? team[0].vaId : null, backups: [] });
  const [priority, setPriority] = useState<ProjectPriority>("normal");
  const [dueDate, setDueDate] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    request.mutate(
      { title: title.trim(), details: details.trim(), links: links.map((l) => l.trim()).filter(Boolean), mainVaId: assign.main, backupVaIds: assign.backups, priority, dueDate: dueDate || null },
      {
        onSuccess: () => {
          notify(
            assign.backups.length
              ? `Task requested with ${assign.backups.length} backup VA${assign.backups.length === 1 ? "" : "s"}.`
              : "Task requested. GoCWGL will confirm it with your VA.",
          );
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
            <p>Pick the main VA and any backups, how urgent it is, and when you need it.</p>
          </header>
          <div className="vrf-section__body">
            <VaAssign team={team} value={assign} onChange={setAssign} idPrefix="pj-new" />
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
