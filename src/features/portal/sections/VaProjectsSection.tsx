"use client";

import { useState } from "react";
import { Avatar, Badge, Icon, LoadState } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { VaRequestOut } from "@/utils/api/models";
import { formatLong, formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useVaRequests } from "@/utils/hooks/useClientWork";
import { TaskBar, TaskFilter, TaskSearch, TaskTabs } from "../components/TaskFilters";
import { VaRequestModal } from "../components/VaRequestModal";
import { WorkEmpty } from "../components/WorkEmpty";
import { REQUEST_STATUS, RequestPopup } from "./TeamSection";

/** Finished or stopped: the VA on it is inactive for the client (name only). */
const ENDED = new Set<VaRequestOut["status"]>(["inactive", "closed", "declined", "cancelled"]);

type View = "requested" | "open" | "done" | "cancelled";

/** On its way to a VA: sent, in review, approved, or finding the VA. */
const REQUESTED = new Set<VaRequestOut["status"]>(["new", "reviewing", "approved", "posted", "interviewing"]);

/**
 * Client portal › VA › Projects: every open project the client requested, by where it is: requested (on its way to a
 * VA), in progress (a VA is on it), completed (ended after a VA worked on it), and cancelled or declined.
 */
export function VaProjectsSection({ asking, onAsk, canRequest }: { asking: boolean; onAsk: (open: boolean) => void; canRequest: boolean }) {
  const requests = useVaRequests();
  // The project open in its pop-up (kept here so a refresh of the list doesn't close it).
  const [openId, setOpenId] = useState("");
  const projects = (requests.data ?? []).filter((r) => r.engagement === "project");
  const requested = projects.filter((r) => REQUESTED.has(r.status));
  const current = projects.filter((r) => r.status === "matched");
  // Ended after a VA worked on it (past its due date, or closed by GoCWGL).
  const done = projects.filter((r) => (r.status === "inactive" || r.status === "closed") && r.matchedVa);
  // Declined, cancelled, or closed before a VA was on it.
  const stopped = projects.filter((r) => r.status === "declined" || r.status === "cancelled" || ((r.status === "inactive" || r.status === "closed") && !r.matchedVa));
  // Tabs, search, VA filter and sort, like Tasks. Opens on the requested ones while any are on their way.
  const [view, setView] = useState<View | null>(null);
  const tab: View = view ?? (requested.length && !current.length ? "requested" : "open");
  const [search, setSearch] = useState("");
  const [vaFilter, setVaFilter] = useState("");
  const [sort, setSort] = useState<"due" | "newest">("due");
  const open = projects.find((r) => r.id === openId) ?? null;
  const vaOf = (r: VaRequestOut) => r.matchedVa ?? r.requestedVa;
  const vas = [...new Map(projects.flatMap((r) => (vaOf(r) ? [[vaOf(r)!.id, vaOf(r)!.name] as const] : []))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const q = search.trim().toLowerCase();
  const lists: Record<View, VaRequestOut[]> = { requested, open: current, done, cancelled: stopped };
  const shown = lists[tab]
    .filter((r) => !vaFilter || vaOf(r)?.id === vaFilter)
    .filter((r) => !q || [r.role, r.category, r.overview, r.important, vaOf(r)?.name].some((x) => x?.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : (tab === "done" || tab === "cancelled" ? -1 : 1) * (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
    );

  return (
    <div className="page-stack">
      <TaskBar
        top={
          <>
            <TaskTabs
              value={tab}
              onChange={setView}
              options={[
                { value: "requested", label: "Requested", count: requested.length },
                { value: "open", label: "In progress", count: current.length },
                { value: "done", label: "Completed", count: done.length },
                { value: "cancelled", label: "Cancelled", count: stopped.length },
              ]}
            />
            <span className="u-spacer" />
            <TaskSearch value={search} onChange={setSearch} placeholder="Search projects or details" />
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
              options={[{ value: "", label: "Any VA" }, ...vas.map(([id, name]) => ({ value: id, label: name }))]}
            />
            <span className="u-spacer" />
            <TaskFilter
              icon="chart"
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "due", label: tab === "done" || tab === "cancelled" ? "Most recent due date" : "Due soonest" },
                { value: "newest", label: "Newest request first" },
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
        query={requests}
        loadingText="Loading your projects…"
        isEmpty={!shown.length}
        empty={
          q || vaFilter ? (
            <WorkEmpty icon="search" title="No projects match these filters" text="Try another search or VA." />
          ) : tab === "requested" || tab === "open" ? (
            <WorkEmpty
              icon="briefcase"
              tone="purple"
              title={tab === "requested" ? "No projects waiting" : "No projects in progress"}
              text={
                tab === "requested"
                  ? "Need one-time work your VAs can’t do? Request a project and GoCWGL reviews it, quotes the payment and assigns a VA with the right skills."
                  : "A requested project moves here once its VA is working on it."
              }
              action={canRequest ? { label: "Request a project", onClick: () => onAsk(true) } : undefined}
            />
          ) : tab === "done" ? (
            <WorkEmpty icon="circleCheck" title="No completed projects yet" text="Finished projects show up here, with the VA who did them." />
          ) : (
            <WorkEmpty icon="close" title="No cancelled or declined projects" text="Projects you cancel, or GoCWGL declines, show up here." />
          )
        }
      >
        <ProjectList projects={shown} onOpen={setOpenId} />
      </LoadState>

      {open && <RequestPopup r={open} onClose={() => setOpenId("")} />}
      {asking && <VaRequestModal project onClose={() => onAsk(false)} onSent={() => setView("requested")} />}
    </div>
  );
}

/** Projects as a list: what, when it's due, the budget, the VA (name only once it's done) and the status. */
function ProjectList({ projects, onOpen }: { projects: VaRequestOut[]; onOpen: (id: string) => void }) {
  return (
    <ul className="rq-list">
      {projects.map((r) => {
        const ended = ENDED.has(r.status);
        // Its request status (Sent, In review, Approved…), or In progress / Completed once a VA is on it.
        const st =
          r.status === "matched"
            ? { label: "In progress", tone: REQUEST_STATUS.matched.tone }
            : (r.status === "inactive" || r.status === "closed") && r.matchedVa
              ? { label: "Completed", tone: REQUEST_STATUS.inactive.tone }
              : REQUEST_STATUS[r.status];
        // Its stage, for the colored edge (like the task rows).
        const stage = REQUESTED.has(r.status) ? "requested" : r.status === "matched" ? "progress" : (r.status === "inactive" || r.status === "closed") && r.matchedVa ? "done" : "stopped";
        // The VA on it, or (still requested) the one the client asked for.
        const va = r.matchedVa ?? (REQUESTED.has(r.status) ? r.requestedVa : null);
        return (
          <li key={r.id}>
            <button type="button" className={`rq-row is-${stage}${ended ? " is-ended" : ""}`} onClick={() => onOpen(r.id)}>
              <span className={`rq-row__icon tone-${st.tone}`} aria-hidden="true">
                <Icon name="folder" size={16} />
              </span>
              <span className="rq-row__main">
                <strong className="rq-row__title">{r.role}</strong>
                <span className="rq-row__meta">
                  {[r.category, r.dueDate && `Due ${formatLong(r.dueDate)}`, r.budgetCents != null && `Budget ${formatCents(r.budgetCents)}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="rq-row__extra">
                {va && (
                  <span className="rq-row__va" title={r.matchedVa ? undefined : "The VA you asked for"}>
                    <Avatar name={va.name} tone={avatarTone(va.id)} size="sm" /> {va.name}
                    {!r.matchedVa && " (asked for)"}
                  </span>
                )}
              </span>
              <span className="rq-row__date">Requested {formatShort(r.createdAt)}</span>
              <Badge tone={st.tone} dot>
                {st.label}
              </Badge>
              <Icon name="chevronRight" size={16} className="rq-row__chev" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
