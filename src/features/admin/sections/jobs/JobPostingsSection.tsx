"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Field,
  FormError,
  Icon,
  IconTile,
  Input,
  LoadState,
  Modal,
  SearchBox,
  Select,
  Tabs,
  Textarea,
  type IconName,
} from "@/components/ui";
import { toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { EmploymentType, JobPostingOut, PostingStatus } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCentsExact } from "@/utils/format/money";
import { useContactsPage } from "@/utils/hooks/useContacts";
import {
  useCreateJobPosting,
  useDeleteJobPosting,
  useJobPostings,
  useMarkJobPostingFilled,
  useUpdateJobPosting,
} from "@/utils/hooks/useJobPostings";
import { useMe } from "@/utils/hooks/useUsers";
import { useVas } from "@/utils/hooks/useVas";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { VaRequestForm } from "@/features/portal/components/VaRequestModal";
import { ApplicantsModal } from "./ApplicantsModal";
import { ClientVaRequests, requestStage, requestTab, type BoardTab } from "./ClientVaRequests";
import { JobRequestPage } from "./JobRequestPage";
import { useAllVaRequests } from "@/utils/hooks/useClientWork";

const STATUS: Record<PostingStatus, { label: string; tab: string; hint: string; icon: IconName; tone: Tone }> = {
  review: { label: "In review", tab: "In review", hint: "Drafts to check", icon: "eye", tone: "amber" },
  live: { label: "Live", tab: "Live", hint: "Open to VAs", icon: "radio", tone: "green" },
  interviewing: { label: "Interviewing", tab: "Interviewing", hint: "Talking to VAs", icon: "message", tone: "sky" },
  filled: { label: "Filled", tab: "Filled", hint: "Successes", icon: "circleCheck", tone: "purple" },
};
const STATUSES = Object.keys(STATUS) as PostingStatus[];

const TYPE_LABEL: Record<EmploymentType, string> = { part_time: "Part-time", full_time: "Full-time", project: "Project" };

/** The one-click step forward from each tab. */
const NEXT: Partial<Record<PostingStatus, { to: PostingStatus; label: string; icon: IconName }>> = {
  review: { to: "live", label: "Publish", icon: "send" },
  live: { to: "interviewing", label: "Start interviewing", icon: "message" },
};

const rateText = (p: Pick<JobPostingOut, "rateMinCents" | "rateMaxCents">) => {
  const { rateMinCents: lo, rateMaxCents: hi } = p;
  if (lo == null && hi == null) return "";
  if (lo != null && hi != null && lo !== hi) return `${formatCentsExact(lo)}–${formatCentsExact(hi)}/hr`;
  return `${formatCentsExact((lo ?? hi)!)}/hr`;
};

/** Engagement › Job Postings: In review → Live → Interviewing → Filled. */
export function JobPostingsSection() {
  const { state } = useAdmin();
  if (state.jobRequestId) return <JobRequestPage key={state.jobRequestId} id={state.jobRequestId} />;
  return <JobPostingsBoard />;
}

function JobPostingsBoard() {
  const { notify, update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const query = useJobPostings();
  const postings = query.data ?? [];
  const requests = useAllVaRequests();
  const allRequests = requests.data ?? [];
  // A request with a job posting follows that posting's status; the posting itself shows as the request's card.
  const postingStatus = new Map(postings.map((p) => [p.id, p.status as string]));
  const stageOf = (r: (typeof allRequests)[number]) => requestStage(r, r.jobPostingId ? postingStatus.get(r.jobPostingId) : undefined);
  const tabOf = (r: (typeof allRequests)[number]) => requestTab(stageOf(r));
  const linked = new Set(allRequests.map((r) => r.jobPostingId).filter(Boolean) as string[]);
  const fresh = allRequests.filter((r) => tabOf(r) === "requests").length;
  // Job post → the client request it was made from (opens that request's full page).
  const requestOf = new Map(allRequests.filter((r) => r.jobPostingId).map((r) => [r.jobPostingId as string, r.id]));
  // Until a tab is picked: new client requests when there are some, else Live.
  const [picked, setTab] = useState<BoardTab | null>(null);
  const tab = picked ?? (fresh ? "requests" : "live");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const matchesRequest = (r: (typeof allRequests)[number]) =>
    !q || [r.role, r.clientName, r.overview].some((x) => x?.toLowerCase().includes(q));
  const shownRequests = allRequests.filter((r) => tabOf(r) === tab && matchesRequest(r));
  const [editing, setEditing] = useState<JobPostingOut | "new" | null>(null);
  const [filling, setFilling] = useState<JobPostingOut | null>(null);
  const [applicants, setApplicants] = useState<JobPostingOut | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const move = useUpdateJobPosting();
  const remove = useDeleteJobPosting();

  const count = (t: BoardTab) => postings.filter((p) => p.status === t && !linked.has(p.id)).length + allRequests.filter((r) => tabOf(r) === t).length;
  const shown = postings.filter(
    (p) =>
      p.status === tab &&
      !linked.has(p.id) &&
      (!q || [p.title, p.client?.name, p.client?.company, ...p.skills].some((x) => x?.toLowerCase().includes(q))),
  );

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="board__bar board__bar--stacked">
          <Tabs<BoardTab>
            label="Job postings"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "requests" as const,
                label: "Client requests",
                hint: "New, not looked at yet",
                icon: "userPlus" as const,
                tone: "brand" as const,
                count: requests.isPending ? "–" : fresh,
              },
              ...STATUSES.map((s) => ({
                value: s,
                label: STATUS[s].tab,
                hint: STATUS[s].hint,
                icon: STATUS[s].icon,
                tone: STATUS[s].tone,
                count: query.isPending || requests.isPending ? "–" : count(s),
              })),
              {
                value: "inactive" as const,
                label: "Inactive",
                hint: "No longer active",
                icon: "pause" as const,
                tone: "slate" as const,
                count: requests.isPending ? "–" : count("inactive"),
              },
            ]}
          />
          <div className="board__actions">
            <SearchBox label="Search job postings" placeholder="Search title, client or skill" value={search} onChange={setSearch} />
            {canWrite && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Icon name="plus" size={14} /> New job posting
              </Button>
            )}
          </div>
        </div>

        {tab === "requests" || tab === "inactive" ? (
          <LoadState query={requests} loadingText="Loading client requests…">
            {shownRequests.length ? (
              <div className="job-grid">
                <ClientVaRequests canWrite={canWrite} requests={shownRequests} stageOf={stageOf} />
              </div>
            ) : (
              <div className="board__empty">
                <span className="text-strong">
                  {q ? `No matches for “${search.trim()}”` : tab === "requests" ? "No new client requests" : "Nothing inactive yet"}
                </span>
                <span className="text-small">
                  {tab === "requests"
                    ? "Requests clients send from their portal land here. Change a request’s status and it moves to that tab."
                    : "Requests you decline or move to Inactive, and ones clients cancel, show up here."}
                </span>
              </div>
            )}
          </LoadState>
        ) : (
        <>
        <FormError error={move.error ?? remove.error} />
        <LoadState query={query} loadingText="Loading job postings…">
          {shown.length === 0 && shownRequests.length === 0 ? (
            <div className="board__empty">
              <span className={cn("board__empty-icon", toneClass(STATUS[tab].tone))} aria-hidden="true">
                <Icon name={STATUS[tab].icon} size={18} />
              </span>
              <span className="text-strong">{q ? `No matches for “${search.trim()}”` : `No ${STATUS[tab].label.toLowerCase()} postings`}</span>
              <span className="text-small">
                {q
                  ? "Try another search, or check the other tabs."
                  : tab === "review"
                    ? "New postings you save for review show up here."
                    : tab === "filled"
                      ? "Postings you mark as filled show up here."
                      : "Move a posting forward and it shows up here."}
              </span>
              {canWrite && !q && tab !== "filled" && (
                <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                  <Icon name="plus" size={13} /> New job posting
                </Button>
              )}
            </div>
          ) : (
            <div className="job-grid">
              <ClientVaRequests canWrite={canWrite} requests={shownRequests} stageOf={stageOf} />
              {shown.map((p) => {
                const next = NEXT[p.status];
                const rate = rateText(p);
                return (
                  <article key={p.id} className={cn("job-card", toneClass(STATUS[p.status].tone))}>
                    <header className="job-card__head">
                      <div className="stack stack--2 u-grow">
                        <h3 className="job-card__title">{p.title}</h3>
                        <span className="text-small">
                          {p.client ? p.client.company || p.client.name : "No client linked"}
                        </span>
                      </div>
                      <Badge tone={STATUS[p.status].tone} dot>
                        {STATUS[p.status].label}
                      </Badge>
                    </header>

                    <ul className="job-card__facts">
                      <li>
                        <Icon name="briefcase" size={13} /> {TYPE_LABEL[p.employmentType]}
                      </li>
                      {p.hoursPerWeek && (
                        <li>
                          <Icon name="clock" size={13} /> {p.hoursPerWeek} hrs/week
                        </li>
                      )}
                      {rate && (
                        <li>
                          <Icon name="dollar" size={13} /> {rate}
                        </li>
                      )}
                      {p.schedule && (
                        <li>
                          <Icon name="globe" size={13} /> {p.schedule}
                        </li>
                      )}
                    </ul>

                    {p.description && <p className="job-card__desc">{p.description}</p>}
                    {p.skills.length > 0 && (
                      <div className="vp-skills">
                        {p.skills.map((s) => (
                          <span key={s} className="vp-skill">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.status === "filled" && (
                      <div className="job-card__success">
                        <Icon name="circleCheck" size={16} />
                        <span>
                          Filled{p.filledVa ? ` by ${p.filledVa.name}` : ""}
                          {p.filledAt ? ` · ${formatShort(p.filledAt)}` : ""}
                        </span>
                      </div>
                    )}

                    <footer className="job-card__foot">
                      <span className="cluster cluster--8">
                        <span className="text-tiny">
                          {p.publishedAt ? `Posted ${formatShort(p.publishedAt)}` : `Created ${formatShort(p.createdAt)}`}
                        </span>
                        {requestOf.has(p.id) && (
                          <button type="button" className="ap-count" onClick={() => update({ jobRequestId: requestOf.get(p.id)! })}>
                            <Icon name="eye" size={12} /> Full details
                          </button>
                        )}
                        {((p.applicationCount ?? 0) > 0 || p.status === "live" || p.status === "interviewing") && (
                          <button type="button" className="ap-count" onClick={() => setApplicants(p)}>
                            <Icon name="users" size={12} /> {p.applicationCount ?? 0} applicant{p.applicationCount === 1 ? "" : "s"}
                          </button>
                        )}
                      </span>
                      {canWrite && (
                        <span className="job-card__actions">
                          <span className="cluster cluster--6">
                          {confirmDelete === p.id ? (
                            <Button
                              size="sm"
                              variant="danger-solid"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate(p.id, { onSuccess: () => notify(`“${p.title}” was deleted.`) })}
                            >
                              Yes, delete
                            </Button>
                          ) : (
                            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(p.id)}>
                              Delete
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                            Edit
                          </Button>
                          </span>
                          <span className="cluster cluster--6">
                          {p.status === "filled" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={move.isPending}
                              onClick={() =>
                                move.mutate({ id: p.id, body: { status: "live" } }, { onSuccess: () => notify(`“${p.title}” is live again.`) })
                              }
                            >
                              Reopen
                            </Button>
                          ) : (
                            <>
                              {next && (
                                <Button
                                  size="sm"
                                  variant={p.status === "review" ? "primary" : "outline"}
                                  disabled={move.isPending}
                                  onClick={() =>
                                    move.mutate(
                                      { id: p.id, body: { status: next.to } },
                                      { onSuccess: () => notify(`“${p.title}” moved to ${STATUS[next.to].tab}.`) },
                                    )
                                  }
                                >
                                  <Icon name={next.icon} size={13} /> {next.label}
                                </Button>
                              )}
                              {p.status !== "review" && (
                                <Button size="sm" variant="primary" onClick={() => setFilling(p)}>
                                  <Icon name="check" size={13} /> Mark as filled
                                </Button>
                              )}
                            </>
                          )}
                          </span>
                        </span>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </LoadState>
        </>
        )}
      </div>

      {editing &&
        (() => {
          // Jobs made from a client request: the request form (same as its full page). Older jobs: the job post form.
          const req = editing !== "new" ? requests.data?.find((r) => r.jobPostingId === editing.id) : undefined;
          return req && editing !== "new" ? (
            <VaRequestForm
              staff
              edit={req}
              posting={editing}
              notify={notify}
              onClose={() => setEditing(null)}
              onFullView={() => {
                setEditing(null);
                update({ jobRequestId: req.id });
              }}
            />
          ) : (
            <JobPostingModal
              posting={editing === "new" ? null : editing}
              onClose={() => setEditing(null)}
              onSaved={(p) => {
                setEditing(null);
                setTab(p.status);
              }}
            />
          );
        })()}
      {creating && <VaRequestForm staff notify={notify} onClose={() => setCreating(false)} onSent={() => setTab("requests")} />}
      {applicants && <ApplicantsModal posting={applicants} canWrite={canWrite} onClose={() => setApplicants(null)} />}
      {filling && (
        <MarkFilledModal
          posting={filling}
          onClose={() => setFilling(null)}
          onDone={() => {
            setFilling(null);
            setTab("filled");
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ New / edit

/** The job post form, for jobs not made from a client request. */
function JobPostingModal({ posting, onClose, onSaved }: { posting: JobPostingOut | null; onClose: () => void; onSaved: (p: JobPostingOut) => void }) {
  const { notify } = useAdmin();
  const create = useCreateJobPosting();
  const save = useUpdateJobPosting();
  const isNew = !posting;
  const [f, setF] = useState({
    title: posting?.title ?? "",
    type: (posting?.employmentType ?? "part_time") as EmploymentType,
    hours: posting?.hoursPerWeek ? String(posting.hoursPerWeek) : "",
    rateMin: posting?.rateMinCents != null ? centsToDollars(posting.rateMinCents) : "",
    rateMax: posting?.rateMaxCents != null ? centsToDollars(posting.rateMaxCents) : "",
    schedule: posting?.schedule ?? "",
    skills: posting?.skills.join(", ") ?? "",
    description: posting?.description ?? "",
  });
  const [client, setClient] = useState<{ id: string; name: string } | null>(
    posting?.client ? { id: posting.client.id, name: posting.client.company || posting.client.name } : null,
  );
  const [clientQuery, setClientQuery] = useState("");
  const cq = useDeferredValue(clientQuery.trim());
  const contacts = useContactsPage({ q: cq, limit: 6 });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));

  const hours = f.hours.trim() ? Number(f.hours) : null;
  const lo = f.rateMin.trim() ? dollarsToCents(f.rateMin) : null;
  const hi = f.rateMax.trim() ? dollarsToCents(f.rateMax) : null;
  const errors = {
    title: !f.title.trim() ? "Give the role a title." : "",
    hours: hours !== null && (!Number.isInteger(hours) || hours < 1 || hours > 80) ? "Between 1 and 80." : "",
    rate: lo !== null && hi !== null && lo > hi ? "The lowest rate is above the highest." : "",
  };
  const invalid = Object.values(errors).some(Boolean);
  const pending = create.isPending || save.isPending;

  const body = () => ({
    title: f.title.trim(),
    clientContactId: client?.id ?? null,
    employmentType: f.type,
    hoursPerWeek: hours,
    rateMinCents: lo,
    rateMaxCents: hi,
    schedule: f.schedule.trim(),
    skills: [...new Set(f.skills.split(",").map((s) => s.trim()).filter(Boolean))],
    description: f.description.trim(),
  });

  const submit = (status?: PostingStatus) => {
    setTried(true);
    if (invalid) return;
    if (isNew) {
      create.mutate(
        { ...body(), status: status ?? "review" },
        {
          onSuccess: (p) => {
            notify(p.status === "live" ? `“${p.title}” is live.` : `“${p.title}” is saved for review.`);
            onSaved(p);
          },
        },
      );
    } else {
      save.mutate(
        { id: posting.id, body: body() },
        {
          onSuccess: (p) => {
            notify(`“${p.title}” is saved.`);
            onSaved(p);
          },
        },
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
      titleId="job-posting"
      kicker="JOB POSTING"
      title={isNew ? "New job posting" : "Edit job posting"}
      subtitle={isNew ? "Save it for review, or publish it right away." : undefined}
      width={620}
      media={
        <IconTile brand size="lg">
          <Icon name="briefcase" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          {isNew ? (
            <>
              <Button type="submit" variant="outline" disabled={pending}>
                Save for review
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => submit("live")}>
                <Icon name="send" size={13} /> Publish now
              </Button>
            </>
          ) : (
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={create.error ?? save.error} />
        <Field label="Role title" htmlFor="jp-title" required error={tried && errors.title}>
          <Input id="jp-title" placeholder="Executive assistant" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        </Field>

        <Field label="Client" htmlFor="jp-client" hint="Optional: who the role is for.">
          {client ? (
            <div className="cluster cluster--between inset inset--soft">
              <span className="text-strong">{client.name}</span>
              <Button size="sm" variant="outline" onClick={() => setClient(null)}>
                Change
              </Button>
            </div>
          ) : (
            <div className="stack stack--6">
              <Input id="jp-client" placeholder="Search clients" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
              {cq &&
                (contacts.data?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="link-card"
                    onClick={() => {
                      setClient({ id: c.id, name: c.company || contactName(c) });
                      setClientQuery("");
                    }}
                  >
                    <span className="stack stack--2 u-grow">
                      <span className="text-strong">{c.company || contactName(c)}</span>
                      <span className="text-tiny">{[contactName(c), c.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Icon name="plus" size={14} />
                  </button>
                ))}
            </div>
          )}
        </Field>

        <div className="form-grid">
          <Field label="Type" htmlFor="jp-type">
            <Select
              id="jp-type"
              value={f.type}
              options={(Object.keys(TYPE_LABEL) as EmploymentType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              onChange={(e) => set({ type: e.target.value as EmploymentType })}
            />
          </Field>
          <Field label="Hours per week" htmlFor="jp-hours" error={tried && errors.hours}>
            <Input id="jp-hours" inputMode="numeric" placeholder="20" value={f.hours} onChange={(e) => set({ hours: e.target.value })} />
          </Field>
          <Field label="Pay from (USD/hr)" htmlFor="jp-lo" error={tried && errors.rate}>
            <Input id="jp-lo" inputMode="decimal" placeholder="6.00" value={f.rateMin} onChange={(e) => set({ rateMin: e.target.value })} />
          </Field>
          <Field label="Pay to (USD/hr)" htmlFor="jp-hi">
            <Input id="jp-hi" inputMode="decimal" placeholder="9.00" value={f.rateMax} onChange={(e) => set({ rateMax: e.target.value })} />
          </Field>
        </div>
        <Field label="Schedule or time zone" htmlFor="jp-schedule">
          <Input id="jp-schedule" placeholder="US Eastern business hours" value={f.schedule} onChange={(e) => set({ schedule: e.target.value })} />
        </Field>
        <Field label="Skills" htmlFor="jp-skills" hint="Separate with commas.">
          <Input id="jp-skills" placeholder="Email, Scheduling, GoHighLevel" value={f.skills} onChange={(e) => set({ skills: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="jp-desc">
          <Textarea
            id="jp-desc"
            rows={6}
            placeholder="What the VA will do day to day, the tools they'll use, and what success looks like."
            value={f.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Mark as filled (the success)

function MarkFilledModal({ posting, onClose, onDone }: { posting: JobPostingOut; onClose: () => void; onDone: () => void }) {
  const { notify } = useAdmin();
  const vas = (useVas().data?.vas ?? []).filter((v) => v.isActive);
  const fill = useMarkJobPostingFilled();
  const [vaId, setVaId] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    fill.mutate(
      { id: posting.id, vaId: vaId || null },
      {
        onSuccess: (p) => {
          notify(`🎉 “${p.title}” is filled${p.filledVa ? ` by ${p.filledVa.name}` : ""}.`);
          onDone();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="job-filled"
      kicker="SUCCESS"
      title="Mark as filled"
      subtitle={`“${posting.title}” moves to Filled.`}
      width={480}
      media={
        <IconTile tone="green" size="lg">
          <Icon name="circleCheck" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={fill.isPending}>
            {fill.isPending ? "Saving…" : "Mark as filled"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={fill.error} />
        <Field label="Who got the role?" htmlFor="jf-va" hint="Optional. Pick the VA you placed.">
          <Select
            id="jf-va"
            value={vaId}
            placeholder="Not one of our VAs / skip"
            options={vas.map((v) => ({ value: v.id, label: `${v.fullName} · ${v.email}` }))}
            onChange={(e) => setVaId(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
