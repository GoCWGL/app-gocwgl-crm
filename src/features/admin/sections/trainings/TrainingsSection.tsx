"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Field,
  FormError,
  Icon,
  IconButton,
  IconTile,
  Input,
  LoadState,
  Modal,
  SearchBox,
  SegmentedControl,
  GroupedPicker,
  Tabs,
  Textarea,
  LessonPlayer,
  TrainingCover,
  type IconName,
} from "@/components/ui";
import { shrinkImage } from "@/lib/images";
import { defaultThumbPath, trainingThumbPath } from "@/utils/api/trainings";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { customCategories, TRAINING_CATEGORIES } from "@/data/trainingCategories";
import { toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { formatMinutes, lessonThumb, videoEmbed } from "@/lib/video";
import { youtubeId } from "@/lib/youtube";
import type { QuestionOut, TrainingAudience, TrainingOut, TrainingStatus } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import {
  useCreateTraining,
  useDefaultThumbnail,
  useDeleteTraining,
  useRemoveDefaultThumbnail,
  useRemoveTrainingThumbnail,
  useSetDefaultThumbnail,
  useSetTrainingThumbnail,
  useTrainingLearners,
  useTrainingStats,
  useTrainings,
  useUpdateTraining,
} from "@/utils/hooks/useTrainings";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { ClientsPicker } from "../../components/ClientsPicker";

const AUDIENCE = {
  va: { tab: "VA trainings", hint: "Lessons with a quiz", icon: "graduation", tone: "cyan", noun: "VA" },
  client: { tab: "Client trainings", hint: "Lessons for clients", icon: "users", tone: "orange", noun: "client" },
} as const;

const STATUS: Record<TrainingStatus, { label: string; tone: "green" | "slate" }> = {
  published: { label: "Published", tone: "green" },
  draft: { label: "Draft", tone: "slate" },
};

type StatusFilter = "all" | TrainingStatus;
type View = "grid" | "list";

/** First lesson's poster (YouTube only), for courses without an uploaded thumbnail. */
const cover = (t: TrainingOut) => (t.lessons[0] ? lessonThumb(t.lessons[0]) : null);

/** Thumbnails: PNG, JPG or WebP. Shrunk in the browser first, so uploads stay well under the hosting's request limit. */
const THUMB_TYPES = "image/png,image/jpeg,image/webp";
const THUMB_MAX_MB = 4;
async function prepareThumbnail(file: File): Promise<{ file: File } | { problem: string }> {
  if (!THUMB_TYPES.split(",").includes(file.type)) return { problem: "Choose a PNG, JPG or WebP image." };
  const ready = await shrinkImage(file, { maxSide: 1280, skipUnder: 400 * 1024 });
  if (ready.size > THUMB_MAX_MB * 1024 * 1024) return { problem: `That image is ${(ready.size / 1024 / 1024).toFixed(1)} MB. Use one under ${THUMB_MAX_MB} MB.` };
  return { file: ready };
}

/** A 16:9 preview with "Upload image" (shrunk in the browser first) and, when there's one, "Remove". */
function ThumbnailPicker({
  id,
  src,
  caption,
  busy,
  error,
  onPick,
  onRemove,
  removeLabel = "Remove",
  replacing = !!src,
}: {
  id: string;
  src: string | null;
  /** Whether "Upload" replaces an image of this course (default: whenever one is shown). */
  replacing?: boolean;
  caption: string;
  busy?: boolean;
  error?: unknown;
  onPick: (file: File) => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  return (
    <div className="thumb-picker">
      <span className="thumb-picker__preview">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview or a signed-in blob: URL
          <img src={src} alt="" />
        ) : (
          <Icon name="graduation" size={24} />
        )}
      </span>
      <span className="stack stack--4">
        <span className="text-small">{caption}</span>
        <span className="cluster cluster--8">
          <label className="resume-cert__upload" htmlFor={id}>
            <input
              id={id}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              disabled={busy || preparing}
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (!picked) return;
                setPreparing(true);
                const ready = await prepareThumbnail(picked);
                setPreparing(false);
                setProblem("problem" in ready ? ready.problem : null);
                if ("file" in ready) onPick(ready.file);
              }}
            />
            <Icon name="upload" size={14} /> {preparing ? "Preparing image…" : busy ? "Uploading…" : replacing ? "Replace image" : "Upload image"}
          </label>
          {onRemove && (
            <Button size="sm" variant="link" disabled={busy} onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </span>
        <span className="text-small">PNG, JPG or WebP. Wide images (16:9) look best, e.g. 1280 × 720.</span>
        {problem && (
          <span className="field__error" role="alert">
            {problem}
          </span>
        )}
        <FormError error={error} />
      </span>
    </div>
  );
}

/** Toolbar › Default thumbnail: the picture every course without its own shows. */
function DefaultThumbnailDialog({ onClose }: { onClose: () => void }) {
  const { notify } = useAdmin();
  const current = useDefaultThumbnail();
  const set = useSetDefaultThumbnail();
  const remove = useRemoveDefaultThumbnail();
  const version = current.data?.thumbnail ?? null;
  const src = useBlobUrl(defaultThumbPath(version));
  return (
    <Modal
      open
      width={560}
      onClose={onClose}
      titleId="default-thumbnail"
      kicker="TRAINING"
      title="Default thumbnail"
      subtitle="Shown on every course that doesn't have its own thumbnail, for VAs, clients and here."
      media={
        <IconTile brand size="lg">
          <Icon name="graduation" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <LoadState query={current} loadingText="Loading…">
        <ThumbnailPicker
          id="default-thumb"
          src={src}
          caption={version ? "This is the default thumbnail." : "No default yet: courses without their own show their first YouTube lesson's image."}
          busy={set.isPending || remove.isPending}
          error={set.error ?? remove.error}
          onPick={(file) => {
            remove.reset();
            set.mutate(file, { onSuccess: () => notify("The default thumbnail is saved.") });
          }}
          onRemove={version ? () => remove.mutate(undefined, { onSuccess: () => notify("The default thumbnail was removed.") }) : undefined}
        />
      </LoadState>
    </Modal>
  );
}

/** The small picture in the list view. */
function CourseRowCover({ t }: { t: TrainingOut }) {
  const path = trainingThumbPath("admin", t.id, t.thumbnail);
  if (!path && !cover(t)) {
    return (
      <span className="course-table__ph">
        <Icon name="graduation" size={16} />
      </span>
    );
  }
  return (
    <span className="course-table__img">
      <TrainingCover path={path} poster={cover(t)} iconSize={16} />
    </span>
  );
}

/** Engagement › Training: courses of YouTube, Loom or Vimeo lessons for VAs and clients; VAs pass a quiz at your passing rate. */
export function TrainingsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = useTrainings();
  const trainings = query.data ?? [];
  const [tab, setTab] = useState<TrainingAudience>("va");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<View>("grid");
  const [openId, setOpenId] = useState("");
  const [editing, setEditing] = useState<TrainingOut | "new" | null>(null);
  const [defaultThumbOpen, setDefaultThumbOpen] = useState(false);
  const q = search.trim().toLowerCase();
  const meta = AUDIENCE[tab];

  const inTab = trainings.filter((t) => t.audience === tab);
  const categories = [...new Set(inTab.map((t) => t.category).filter(Boolean))].sort();
  const byCategory = inTab.filter((t) => !category || t.category === category);
  const shown = byCategory.filter(
    (t) => (status === "all" || t.status === status) && (!q || [t.title, t.description, t.category].some((x) => x.toLowerCase().includes(q))),
  );
  const open = trainings.find((t) => t.id === openId) ?? null;
  const allCategories = [...new Set(trainings.map((t) => t.category).filter(Boolean))].sort();

  const switchTab = (a: TrainingAudience) => {
    setTab(a);
    setCategory("");
    setStatus("all");
  };

  return (
    <div className="page-stack">
      <TrainingStats audience={tab} />

      <div className="card card--flat board">
        <div className="board__bar">
          <Tabs<TrainingAudience>
            label="Trainings"
            value={tab}
            onChange={switchTab}
            options={(Object.keys(AUDIENCE) as TrainingAudience[]).map((a) => ({
              value: a,
              label: AUDIENCE[a].tab,
              hint: AUDIENCE[a].hint,
              icon: AUDIENCE[a].icon,
              tone: AUDIENCE[a].tone,
              count: query.isPending ? "–" : trainings.filter((t) => t.audience === a).length,
            }))}
          />
          {canWrite && (
            <div className="board__actions">
              <Button variant="outline" onClick={() => setDefaultThumbOpen(true)}>
                <Icon name="upload" size={14} /> Default thumbnail
              </Button>
              <Button variant="primary" onClick={() => setEditing("new")}>
                <Icon name="plus" size={14} /> New training
              </Button>
            </div>
          )}
        </div>

        <div className="course-toolbar">
          <div className="stack stack--2">
            <h3 className="course-toolbar__title">{tab === "va" ? "VA courses" : "Client courses"}</h3>
            <span className="text-small">
              {shown.length} of {inTab.length} course{inTab.length === 1 ? "" : "s"} · shown in the {tab === "va" ? "VA portal’s" : "client portal’s"}{" "}
              Training tab
            </span>
          </div>
          <div className="course-toolbar__tools">
            <SearchBox label="Search courses" placeholder="Search courses" value={search} onChange={setSearch} />
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => setView("grid")}>
                <Icon name="grid" size={15} />
              </button>
              <button type="button" aria-pressed={view === "list"} aria-label="List view" title="List view" onClick={() => setView("list")}>
                <Icon name="textLong" size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="course-filters">
          <div className="filter-track" role="group" aria-label="Filter by category">
            <button type="button" className="filter-pill" aria-pressed={!category} onClick={() => setCategory("")}>
              <Icon name="grid" size={13} />
              All categories
              <span className="filter-pill__count">{inTab.length}</span>
            </button>
            {categories.map((c) => (
              <button key={c} type="button" className="filter-pill" aria-pressed={category === c} onClick={() => setCategory(category === c ? "" : c)}>
                {c}
                <span className="filter-pill__count">{inTab.filter((t) => t.category === c).length}</span>
              </button>
            ))}
          </div>
          <div className="filter-track filter-track--status" role="group" aria-label="Filter by status">
            {(
              [
                ["all", "All", "cyan"],
                ["published", "Published", "green"],
                ["draft", "Drafts", "slate"],
              ] as const
            ).map(([value, label, tone]) => (
              <button
                key={value}
                type="button"
                className={cn("filter-pill", toneClass(tone))}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {value !== "all" && <span className="filter-pill__dot" aria-hidden="true" />}
                {label}
                <span className="filter-pill__count">
                  {value === "all" ? byCategory.length : byCategory.filter((t) => t.status === value).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <LoadState query={query} loadingText="Loading trainings…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className={cn("board__empty-icon", toneClass(meta.tone))} aria-hidden="true">
                <Icon name="graduation" size={18} />
              </span>
              <span className="text-strong">
                {inTab.length ? "No courses match these filters" : `No ${meta.noun} courses yet`}
              </span>
              <span className="text-small">
                {inTab.length ? "Try another search or filter." : "Add YouTube, Loom or Vimeo lessons, a few quiz questions and the score needed to pass."}
              </span>
              {canWrite && !inTab.length && (
                <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
                  <Icon name="plus" size={13} /> New training
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="training-grid">
              {shown.map((t) => (
                <button key={t.id} type="button" className="training-card" onClick={() => setOpenId(t.id)}>
                  <span className="training-card__thumb">
                    <TrainingCover path={trainingThumbPath("admin", t.id, t.thumbnail)} poster={cover(t)} />
                    {t.lessons.length > 0 && (
                      <span className="training-card__lessons">
                        <Icon name="video" size={12} /> {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <span className="training-card__body">
                    {t.category && <span className="training-card__category">{t.category}</span>}
                    <span className="training-card__top">
                      <span className="training-card__title">{t.title}</span>
                      <Badge tone={STATUS[t.status].tone} dot>
                        {STATUS[t.status].label}
                      </Badge>
                    </span>
                    <span className="training-card__meta">
                      <span>
                        <Icon name="survey" size={12} /> {t.questions.length} question{t.questions.length === 1 ? "" : "s"}
                      </span>
                      {t.questions.length > 0 && (
                        <span>
                          <Icon name="gauge" size={12} /> Pass {t.passingRate}%
                        </span>
                      )}
                      <span>
                        <Icon name="userPlus" size={12} /> {t.peopleEnrolled} registered
                      </span>
                    </span>
                    {t.audience === "va" && t.questions.length > 0 && (
                      <span className="training-card__progress">
                        <span className="training-card__bar">
                          <span style={{ width: `${t.peopleTried ? (t.peoplePassed / t.peopleTried) * 100 : 0}%` }} />
                        </span>
                        <span className="text-small">
                          {t.peopleTried ? `${t.peoplePassed} of ${t.peopleTried} VAs passed` : "No VA has taken the quiz yet"}
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table data-table--plain course-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Lessons</th>
                    <th>Quiz</th>
                    <th>Status</th>
                    <th>Registered</th>
                    {tab === "va" && <th>VAs passed</th>}
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <button type="button" className="cell-button course-table__course" onClick={() => setOpenId(t.id)}>
                          <CourseRowCover t={t} />
                          <span className="stack stack--2">
                            <strong className="data-table__strong">{t.title}</strong>
                            <span className="text-small">{t.category || "No category"}</span>
                          </span>
                        </button>
                      </td>
                      <td>{t.lessons.length}</td>
                      <td>{t.questions.length ? `${t.questions.length} · pass ${t.passingRate}%` : "No quiz"}</td>
                      <td>
                        <Badge tone={STATUS[t.status].tone} dot>
                          {STATUS[t.status].label}
                        </Badge>
                      </td>
                      <td>
                        {t.peopleEnrolled}
                        {t.peopleEnrolled > 0 && <span className="text-small"> · {t.peopleCompleted} done</span>}
                      </td>
                      {tab === "va" && <td>{t.questions.length ? `${t.peoplePassed} of ${t.peopleTried}` : "—"}</td>}
                      <td>{formatShort(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadState>
      </div>

      {open && (
        <TrainingDetail
          training={open}
          canWrite={canWrite}
          onClose={() => setOpenId("")}
          onEdit={() => {
            setEditing(open);
            setOpenId("");
          }}
        />
      )}
      {defaultThumbOpen && <DefaultThumbnailDialog onClose={() => setDefaultThumbOpen(false)} />}
      {editing && (
        <TrainingEditor
          training={editing === "new" ? null : editing}
          audience={tab}
          categories={allCategories}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setEditing(null);
            switchTab(t.audience);
            setOpenId(t.id);
          }}
        />
      )}
    </div>
  );
}

/** The four numbers above the courses (per tab). */
function TrainingStats({ audience }: { audience: TrainingAudience }) {
  const stats = useTrainingStats(audience).data;
  const v = (n: number | null | undefined) => (n === undefined ? "–" : n === null ? "—" : String(n));
  const courses = stats ? stats.published + stats.drafts : 0;
  const tiles: Array<{ icon: IconName; tone: Tone; label: string; value: string; sub: string }> = [
    {
      icon: "graduation",
      tone: "amber",
      label: "Published courses",
      value: v(stats?.published),
      sub: stats ? `${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}` : "",
    },
    { icon: "video", tone: "sky", label: "Lessons", value: v(stats?.lessons), sub: stats ? `Across ${courses} course${courses === 1 ? "" : "s"}` : "" },
    {
      icon: "users",
      tone: "purple",
      label: "Active learners",
      value: v(stats?.learners),
      sub: audience === "va" ? "VAs with portal access" : "Clients with portal access",
    },
    {
      icon: "circleCheck",
      tone: "green",
      label: "Avg. completion",
      value: stats ? (stats.avgCompletion === null ? "—" : `${stats.avgCompletion}%`) : "–",
      sub: audience === "va" ? "Across all VAs" : "Clients don’t take quizzes",
    },
  ];
  return (
    <div className="card training-stats">
      {tiles.map((tile) => (
        <div key={tile.label} className="training-stats__tile">
          <IconTile tone={tile.tone} size="md">
            <Icon name={tile.icon} size={17} />
          </IconTile>
          <span className="stack stack--2">
            <span className="training-stats__label">{tile.label}</span>
            <span className="training-stats__value">{tile.value}</span>
            <span className="text-small">{tile.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Detail

function TrainingDetail({ training: t, canWrite, onClose, onEdit }: { training: TrainingOut; canWrite: boolean; onClose: () => void; onEdit: () => void }) {
  const { notify } = useAdmin();
  const save = useUpdateTraining();
  const remove = useDeleteTraining();
  const learners = useTrainingLearners(t.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = AUDIENCE[t.audience];
  const publish = (status: TrainingStatus) =>
    save.mutate(
      { id: t.id, body: { status } },
      { onSuccess: () => notify(status === "published" ? `“${t.title}” is published.` : `“${t.title}” is back to draft.`) },
    );

  return (
    <Modal
      open
      variant="drawer"
      width={680}
      onClose={onClose}
      titleId="training-detail"
      kicker={`${meta.tab.toUpperCase()}${t.category ? ` · ${t.category.toUpperCase()}` : ""}`}
      title={t.title}
      subtitle={`${STATUS[t.status].label} · updated ${formatShort(t.updatedAt)}${t.updatedByName ? ` by ${t.updatedByName}` : ""}`}
      media={
        <IconTile tone={meta.tone} size="lg">
          <Icon name="graduation" size={18} />
        </IconTile>
      }
      footer={
        canWrite ? (
          <>
            {confirmDelete ? (
              <Button
                variant="danger-solid"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(t.id, {
                    onSuccess: () => {
                      notify(`“${t.title}” was deleted.`);
                      onClose();
                    },
                  })
                }
              >
                Yes, delete
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <span className="u-spacer" />
            {t.status === "draft" ? (
              <Button variant="outline" disabled={save.isPending} onClick={() => publish("published")}>
                <Icon name="send" size={13} /> Publish
              </Button>
            ) : (
              <Button variant="outline" disabled={save.isPending} onClick={() => publish("draft")}>
                Unpublish
              </Button>
            )}
            <Button variant="primary" onClick={onEdit}>
              <Icon name="edit" size={13} /> Edit
            </Button>
          </>
        ) : (
          <>
            <span className="u-spacer" />
            <Button onClick={onClose}>Close</Button>
          </>
        )
      }
    >
      <div className="stack stack--16">
        <FormError error={save.error ?? remove.error} />
        {t.lessons.length ? <LessonPlayer lessons={t.lessons} /> : <span className="vp-empty">No lessons yet.</span>}
        {t.description && <p className="va-pre">{t.description}</p>}

        {t.questions.length > 0 && (
          <div className="stack stack--8">
            <div className="cluster cluster--between">
              <span className="kicker">QUIZ · {t.questions.length} QUESTIONS</span>
              <Badge tone="purple">Pass at {t.passingRate}%</Badge>
            </div>
            <ol className="quiz-key">
              {t.questions.map((q, i) => (
                <li key={q.id}>
                  <span className="quiz-key__q">
                    {i + 1}. {q.text}
                  </span>
                  {q.kind === "text" ? (
                    <ul>
                      <li className="quiz-key__typed">
                        <Icon name="textShort" size={14} /> Typed answer · accepts:
                      </li>
                      {q.accepted.map((a, j) => (
                        <li key={j} className="is-correct">
                          <Icon name="circleCheck" size={14} />
                          {a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul>
                      {q.options.map((o, j) => (
                        <li key={j} className={cn(j === q.correct && "is-correct")}>
                          <Icon name={j === q.correct ? "circleCheck" : "radio"} size={14} />
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="stack stack--8">
          <div className="cluster cluster--between">
            <span className="kicker">
              REGISTERED {t.audience === "va" ? "VAS" : "CLIENTS"} · {t.peopleEnrolled}
            </span>
            {t.peopleEnrolled > 0 && (
              <span className="text-small">
                {t.peopleCompleted} of {t.peopleEnrolled} finished
              </span>
            )}
          </div>
          <LoadState query={learners} isEmpty={!learners.data?.length} empty="Nobody has registered for this course yet." inline>
            <div className="table-scroll">
              <table className="data-table data-table--plain learner-table">
                <thead>
                  <tr>
                    <th>{t.audience === "va" ? "VA" : "Client"}</th>
                    <th>Progress</th>
                    {t.questions.length > 0 && <th>Quiz</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {learners.data?.map((r) => {
                    const pct = r.lessonsTotal ? Math.round((r.lessonsWatched / r.lessonsTotal) * 100) : 0;
                    const state = r.completedAt
                      ? { tone: "green" as const, label: r.passed ? "Passed" : "Completed" }
                      : r.tries
                        ? { tone: "amber" as const, label: "Not passed yet" }
                        : r.currentStep || r.lessonsWatched
                          ? { tone: "cyan" as const, label: "In progress" }
                          : { tone: "slate" as const, label: "Not started" };
                    return (
                      <tr key={r.userId}>
                        <td>
                          <div className="stack stack--2">
                            <span className="u-strong u-ink">{r.name}</span>
                            <span className="text-small">{r.email}</span>
                            <span className="text-small">Registered {formatShort(r.enrolledAt)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="learner-table__progress">
                            <span className="training-card__bar">
                              <span style={{ width: `${pct}%` }} />
                            </span>
                            <span className="text-small">
                              {r.lessonsWatched} of {r.lessonsTotal} lessons
                            </span>
                            {r.currentLabel && <span className="learner-table__now">Now on: {r.currentLabel}</span>}
                            {r.lastActiveAt && <span className="text-small">Active {formatShort(r.lastActiveAt)}</span>}
                          </div>
                        </td>
                        {t.questions.length > 0 && <td>{r.bestScore !== null ? `${r.bestScore}% · ${r.tries} tr${r.tries === 1 ? "y" : "ies"}` : "—"}</td>}
                        <td>
                          <Badge tone={state.tone} dot>
                            {state.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </LoadState>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Editor

type BuilderStep = "details" | "lessons" | "quiz";
const STEPS: Array<{ id: BuilderStep; label: string }> = [
  { id: "details", label: "Details" },
  { id: "lessons", label: "Lessons" },
  { id: "quiz", label: "Quiz" },
];

type DraftLesson = { key: string; id: string; title: string; videoUrl: string; minutes: string; summary: string };
const blankLesson = (): DraftLesson => ({ key: crypto.randomUUID(), id: "", title: "", videoUrl: "", minutes: "", summary: "" });
/** Length is optional; when given, whole minutes up to 600. */
const badMinutes = (m: string) => (m.trim() ? !/^\d{1,3}$/.test(m.trim()) || Number(m) > 600 : false);

type QuestionKind = QuestionOut["kind"];

/** Both kinds' fields are kept, so switching a question's type back and forth loses nothing. */
type DraftQuestion = { key: string; id: string; kind: QuestionKind; text: string; options: string[]; correct: number; accepted: string[] };
const blankQuestion = (kind: QuestionKind = "choice"): DraftQuestion => ({
  key: crypto.randomUUID(),
  id: "",
  kind,
  text: "",
  options: ["", ""],
  correct: 0,
  accepted: [""],
});
const filled = (xs: string[]) => xs.filter((x) => x.trim());

function TrainingEditor({
  training,
  audience,
  categories,
  onClose,
  onSaved,
}: {
  training: TrainingOut | null;
  audience: TrainingAudience;
  categories: string[];
  onClose: () => void;
  onSaved: (t: TrainingOut) => void;
}) {
  const { notify } = useAdmin();
  const create = useCreateTraining();
  const save = useUpdateTraining();
  const setThumb = useSetTrainingThumbnail();
  const removeThumb = useRemoveTrainingThumbnail();
  const defaultThumb = useDefaultThumbnail();
  const isNew = !training;
  // A new picture (uploaded when the course is saved), or "remove" to go back to the default.
  const [thumb, setThumbChoice] = useState<{ file: File; url: string } | "remove" | null>(null);
  const savedThumb = useBlobUrl(training ? trainingThumbPath("admin", training.id, training.thumbnail) : null);
  const defaultSrc = useBlobUrl(defaultThumbPath(defaultThumb.data?.thumbnail));
  const hasOwn = thumb ? thumb !== "remove" : !!training?.hasOwnThumbnail;
  const thumbSrc = thumb === "remove" ? defaultSrc : thumb ? thumb.url : training?.hasOwnThumbnail ? savedThumb : (savedThumb ?? defaultSrc);
  const pickThumb = (file: File) =>
    setThumbChoice((old) => {
      if (old && old !== "remove") URL.revokeObjectURL(old.url);
      return { file, url: URL.createObjectURL(file) };
    });
  const [f, setF] = useState({
    audience: training?.audience ?? audience,
    title: training?.title ?? "",
    category: training?.category ?? "",
    description: training?.description ?? "",
    rate: String(training?.passingRate ?? 80),
  });
  // Client trainings: who it's for (only they see it in their portal).
  const [clientIds, setClientIds] = useState<string[]>(training?.clientIds ?? []);
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    training?.questions.length
      ? training.questions.map((q) => ({
          key: q.id,
          id: q.id,
          kind: q.kind ?? "choice",
          text: q.text,
          options: q.options.length ? q.options : ["", ""],
          correct: q.correct,
          accepted: q.accepted?.length ? q.accepted : [""],
        }))
      : [blankQuestion()],
  );
  const [lessons, setLessons] = useState<DraftLesson[]>(
    training?.lessons.length ? training.lessons.map((l) => ({ key: l.id, id: l.id, title: l.title, videoUrl: l.videoUrl, minutes: l.minutes ? String(l.minutes) : "", summary: l.summary })) : [blankLesson()],
  );
  const [tried, setTried] = useState(false);
  const [step, setStep] = useState<BuilderStep>("details");
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));
  const setL = (i: number, patch: Partial<DraftLesson>) => setLessons((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const moveL = (i: number, by: number) =>
    setLessons((ls) => {
      const next = [...ls];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const usedLessons = lessons.filter((l) => l.title.trim() || l.videoUrl.trim());
  const badLesson = usedLessons.findIndex((l) => !videoEmbed(l.videoUrl));
  const badLength = usedLessons.findIndex((l) => badMinutes(l.minutes));
  const setQ = (i: number, patch: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const rate = Number(f.rate);
  // Questions that are entirely empty are skipped; partly filled ones must be complete.
  const used = questions.filter((q) => q.text.trim() || filled(q.kind === "text" ? q.accepted : q.options).length);
  const qError = used.findIndex((q) =>
    q.kind === "text" ? !q.text.trim() || !filled(q.accepted).length : !q.text.trim() || filled(q.options).length < 2 || !q.options[q.correct]?.trim(),
  );
  const errors = {
    title: !f.title.trim() ? "Give the training a title." : "",
    lessons:
      badLesson >= 0
        ? `Lesson ${lessons.indexOf(usedLessons[badLesson]) + 1}: paste a YouTube, Loom or Vimeo link.`
        : badLength >= 0
          ? `Lesson ${lessons.indexOf(usedLessons[badLength]) + 1}: the length is whole minutes, up to 600.`
          : "",
    rate: !Number.isInteger(rate) || rate < 1 || rate > 100 ? "A whole number from 1 to 100." : "",
    questions:
      qError >= 0
        ? used[qError].kind === "text"
          ? `Question ${questions.indexOf(used[qError]) + 1} needs its text and at least one accepted answer.`
          : `Question ${questions.indexOf(used[qError]) + 1} needs its text, at least two answers, and the right one picked.`
        : "",
  };
  const pending = create.isPending || save.isPending || setThumb.isPending || removeThumb.isPending;

  const stepErrors: Record<BuilderStep, string> = {
    details: errors.title,
    lessons: errors.lessons,
    quiz: errors.rate || errors.questions,
  };
  const submit = (status?: TrainingStatus) => {
    setTried(true);
    const firstBad = STEPS.find((s) => stepErrors[s.id]);
    if (firstBad) {
      setStep(firstBad.id);
      return;
    }
    const body = {
      title: f.title.trim(),
      audience: f.audience,
      category: f.category.trim(),
      lessons: usedLessons.map((l) => ({
        id: l.id,
        title: l.title.trim(),
        videoUrl: l.videoUrl.trim(),
        minutes: Number(l.minutes.trim() || 0),
        summary: l.summary.trim(),
      })),
      description: f.description.trim(),
      passingRate: rate,
      ...(f.audience === "client" && { clientIds }),
      questions: used.map((q) => {
        if (q.kind === "text") return { id: q.id, kind: "text" as const, text: q.text.trim(), accepted: filled(q.accepted).map((a) => a.trim()) };
        // Drop blank answers but keep the right one pointing at the same text.
        const kept = q.options.map((o, j) => ({ o: o.trim(), j })).filter((x) => x.o);
        return { id: q.id, kind: "choice" as const, text: q.text.trim(), options: kept.map((x) => x.o), correct: kept.findIndex((x) => x.j === q.correct) };
      }),
      ...(status && { status }),
    };
    const done = async (saved: TrainingOut) => {
      let t = saved;
      // The thumbnail goes up after the course is saved (a new course has no id before that).
      try {
        if (thumb && thumb !== "remove") t = await setThumb.mutateAsync({ id: saved.id, file: thumb.file });
        else if (thumb === "remove" && saved.hasOwnThumbnail) t = await removeThumb.mutateAsync(saved.id);
      } catch {
        if (isNew) {
          // The course exists now: keep the editor open on it so the thumbnail can be tried again.
          notify(`“${saved.title}” is saved, but its thumbnail didn't upload. Open it and try again.`);
          onSaved(saved);
        }
        return; // the error shows above the form
      }
      if (thumb && thumb !== "remove") URL.revokeObjectURL(thumb.url);
      notify(isNew ? (t.status === "published" ? `“${t.title}” is published.` : `“${t.title}” is saved as a draft.`) : `“${t.title}” is saved.`);
      onSaved(t);
    };
    if (isNew) create.mutate({ ...body, status: status ?? "draft" }, { onSuccess: done });
    else save.mutate({ id: training.id, body }, { onSuccess: done });
  };

  const minutes = usedLessons.reduce((sum, l) => sum + (badMinutes(l.minutes) ? 0 : Number(l.minutes.trim() || 0)), 0);
  const stepIndex = STEPS.findIndex((x) => x.id === step);
  const firstThumb = usedLessons.map((l) => youtubeId(l.videoUrl)).find(Boolean);
  const stepSub: Record<BuilderStep, string> = {
    details: f.title.trim() || "Title, audience, category",
    lessons: usedLessons.length
      ? `${usedLessons.length} lesson${usedLessons.length === 1 ? "" : "s"}${minutes ? ` · ${formatMinutes(minutes)}` : ""}`
      : "No lessons yet",
    quiz: used.length ? `${used.length} question${used.length === 1 ? "" : "s"} · pass ${f.rate || "–"}%` : "No quiz",
  };

  return (
    <Modal
      open
      width={1000}
      className="course-builder"
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
      titleId="training-editor"
      kicker={f.audience === "va" ? "VA TRAINING" : "CLIENT TRAINING"}
      title={isNew ? "Create a course" : `Edit “${training.title}”`}
      subtitle="Add the details, the video lessons, then a quiz. Learners pass at your passing rate."
      media={
        <IconTile brand size="lg">
          <Icon name="graduation" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1].id)}>
            <Icon name="chevronLeft" size={13} /> Back
          </Button>
          {stepIndex < STEPS.length - 1 && (
            <Button variant="outline" onClick={() => setStep(STEPS[stepIndex + 1].id)}>
              Next: {STEPS[stepIndex + 1].label} <Icon name="chevronRight" size={13} />
            </Button>
          )}
          <span className="u-spacer" />
          <Button variant="link" onClick={onClose}>
            Cancel
          </Button>
          {isNew ? (
            <>
              <Button type="submit" variant="outline" disabled={pending}>
                Save as draft
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => submit("published")}>
                <Icon name="send" size={13} /> {pending ? "Saving…" : "Publish course"}
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
      <nav className="course-builder__rail" aria-label="Course builder steps">
        <ol>
          {STEPS.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                aria-current={step === x.id ? "step" : undefined}
                className={cn(tried && stepErrors[x.id] && "has-error")}
                onClick={() => setStep(x.id)}
              >
                <span className="course-builder__n">{tried && stepErrors[x.id] ? "!" : i + 1}</span>
                <span className="course-builder__step">
                  <span className="course-builder__label">{x.label}</span>
                  <span className="course-builder__sub">{stepSub[x.id]}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="course-builder__preview" aria-hidden>
          <span className="course-builder__cover">
            {thumbSrc || firstThumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- the uploaded thumbnail, or a remote YouTube poster
              <img src={thumbSrc ?? lessonThumb({ provider: "youtube", videoId: firstThumb! })!} alt="" />
            ) : (
              <Icon name="play" size={20} />
            )}
          </span>
          <span className="course-builder__preview-body">
            {f.category && <span className="training-card__category">{f.category}</span>}
            <strong>{f.title.trim() || "Untitled course"}</strong>
            <span className="text-small">{stepSub.lessons}</span>
          </span>
        </div>
      </nav>

      <div className="course-builder__content">
        <FormError error={create.error ?? save.error ?? setThumb.error ?? removeThumb.error} />

        {step === "details" && (
          <section className="course-builder__section">
            <header>
              <h3>Course details</h3>
              <p>What learners see on the course card and at the top of the course.</p>
            </header>
            <div className="course-builder__grid">
              <Field label="For">
                <SegmentedControl<TrainingAudience>
                  kind="radio"
                  variant="soft"
                  size="sm"
                  label="Who this training is for"
                  value={f.audience}
                  onChange={(a) => set({ audience: a })}
                  options={[
                    { value: "va", label: "VAs" },
                    { value: "client", label: "Clients" },
                  ]}
                />
              </Field>
              <Field label="Category" htmlFor="tr-cat" hint="Groups courses here and in the portal.">
                <GroupedPicker
                  id="tr-cat"
                  value={f.category}
                  onChange={(category) => set({ category })}
                  placeholder="Choose a category"
                  emptyLabel="No category"
                  searchPlaceholder="Search categories"
                  groups={[
                    ...TRAINING_CATEGORIES[f.audience].map((g) => ({ group: g.group, icon: g.icon, options: g.categories })),
                    // Ones already in use that aren't in the list (and this course's own), so nothing is lost.
                    ...(customCategories(f.audience, [...categories, f.category]).length
                      ? [{ group: "Your categories", icon: "tag" as const, options: customCategories(f.audience, [...categories, f.category]) }]
                      : []),
                  ]}
                />
              </Field>
            </div>
            {f.audience === "client" && (
              <Field
                label={`Clients${clientIds.length ? ` · ${clientIds.length}` : ""}`}
                htmlFor="tr-clients"
                hint="Only these clients see this training. Their Training menu appears once they have one."
              >
                <ClientsPicker id="tr-clients" value={clientIds} onChange={setClientIds} />
              </Field>
            )}
            <Field label="Title" htmlFor="tr-title" required error={tried && errors.title}>
              <Input id="tr-title" placeholder="ELSAiA Module 2 · Daily reporting" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
            </Field>
            <Field label="Description" htmlFor="tr-desc" hint="A short paragraph on what they'll learn and why it matters.">
              <Textarea id="tr-desc" rows={5} placeholder="What they'll learn and why it matters." value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label="Thumbnail" htmlFor="tr-thumb" hint="The picture on the course card.">
              <ThumbnailPicker
                id="tr-thumb"
                src={thumbSrc}
                caption={
                  thumb && thumb !== "remove"
                    ? "New image: it's saved with the course."
                    : hasOwn
                      ? "This course's own thumbnail."
                      : defaultThumb.data?.thumbnail
                        ? "Using the default thumbnail. Upload an image to give this course its own."
                        : "No thumbnail yet: the card shows the first YouTube lesson's image. You can also set a default for all courses."
                }
                busy={setThumb.isPending}
                replacing={hasOwn}
                onPick={pickThumb}
                onRemove={
                  hasOwn
                    ? () =>
                        setThumbChoice((old) => {
                          if (old && old !== "remove") URL.revokeObjectURL(old.url);
                          return training?.hasOwnThumbnail ? "remove" : null;
                        })
                    : undefined
                }
                removeLabel={defaultThumb.data?.thumbnail ? "Use the default" : "Remove"}
              />
            </Field>
          </section>
        )}

        {step === "lessons" && (
          <section className="course-builder__section">
            <header>
              <h3>Lessons</h3>
              <p>YouTube, Loom or Vimeo videos, watched in this order. Unlisted videos work too.</p>
            </header>
            {lessons.map((l, i) => {
              const video = videoEmbed(l.videoUrl);
              const ytId = youtubeId(l.videoUrl);
              const thumb = ytId ? lessonThumb({ provider: "youtube", videoId: ytId }) : null;
              const badLink = tried && !!l.videoUrl.trim() && !video;
              return (
                <div key={l.key} className="lesson-card">
                  <span className={cn("lesson-card__thumb", video && !thumb && "is-poster")}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                      <img src={thumb} alt="" />
                    ) : (
                      <Icon name={video ? "play" : "video"} size={18} />
                    )}
                    <span className="lesson-card__n">{i + 1}</span>
                    {video && <span className="lesson-card__provider">{video.provider}</span>}
                  </span>
                  <span className="lesson-card__fields">
                    <span className="lesson-card__row">
                      <Input
                        aria-label={`Lesson ${i + 1} title`}
                        placeholder={`Lesson ${i + 1} title`}
                        value={l.title}
                        onChange={(e) => setL(i, { title: e.target.value })}
                      />
                      <span className="lesson-row__minutes">
                        <Input
                          aria-label={`Lesson ${i + 1} length in minutes`}
                          inputMode="numeric"
                          placeholder="Length"
                          value={l.minutes}
                          aria-invalid={tried && badMinutes(l.minutes)}
                          onChange={(e) => setL(i, { minutes: e.target.value })}
                        />
                        <span>min</span>
                      </span>
                    </span>
                    <Input
                      aria-label={`Lesson ${i + 1} video link`}
                      type="url"
                      placeholder="Paste a YouTube, Loom or Vimeo link"
                      value={l.videoUrl}
                      aria-invalid={badLink}
                      onChange={(e) => setL(i, { videoUrl: e.target.value })}
                    />
                    <Input
                      aria-label={`Lesson ${i + 1} summary`}
                      placeholder="One line on what they'll learn (optional)"
                      maxLength={300}
                      value={l.summary}
                      onChange={(e) => setL(i, { summary: e.target.value })}
                    />
                  </span>
                  <span className="lesson-card__tools">
                    <IconButton label="Move up" size="sm" ghost disabled={i === 0} onClick={() => moveL(i, -1)}>
                      <Icon name="chevronUp" size={14} />
                    </IconButton>
                    <IconButton label="Move down" size="sm" ghost disabled={i === lessons.length - 1} onClick={() => moveL(i, 1)}>
                      <Icon name="chevronDown" size={14} />
                    </IconButton>
                    <IconButton label="Remove lesson" size="sm" ghost onClick={() => setLessons((ls) => ls.filter((_, j) => j !== i))}>
                      <Icon name="trash" size={14} />
                    </IconButton>
                  </span>
                </div>
              );
            })}
            {tried && errors.lessons && (
              <p className="text-error" role="alert">
                {errors.lessons}
              </p>
            )}
            <button type="button" className="course-builder__add" disabled={lessons.length >= 100} onClick={() => setLessons((ls) => [...ls, blankLesson()])}>
              <Icon name="plus" size={14} /> Add a lesson
            </button>
          </section>
        )}

        {step === "quiz" && (
          <section className="course-builder__section">
            <header className="course-builder__head-row">
              <span>
                <h3>Quiz</h3>
                <p>Optional. Multiple choice (click the circle beside the right answer) or a typed answer. Leave it empty for no quiz.</p>
              </span>
              <Field label="Passing rate" htmlFor="tr-rate" error={tried && errors.rate} className="quiz-builder__rate">
                <span className="quiz-builder__pct">
                  <Input id="tr-rate" inputMode="numeric" value={f.rate} onChange={(e) => set({ rate: e.target.value })} />
                  <span>%</span>
                </span>
              </Field>
            </header>
            {questions.map((q, i) => (
              <div key={q.key} className="quiz-builder__q">
                <div className="cluster cluster--nowrap">
                  <span className="sop-steps__n">{i + 1}</span>
                  <Input aria-label={`Question ${i + 1}`} placeholder="Question" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                  <IconButton label="Remove question" size="sm" ghost onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    <Icon name="trash" size={14} />
                  </IconButton>
                </div>
                <div className="quiz-builder__kind">
                  <SegmentedControl<QuestionKind>
                    kind="radio"
                    variant="soft"
                    size="sm"
                    label={`Question ${i + 1} type`}
                    value={q.kind}
                    onChange={(kind) => setQ(i, { kind })}
                    options={[
                      { value: "choice", label: "Multiple choice" },
                      { value: "text", label: "Typed answer" },
                    ]}
                  />
                </div>
                {q.kind === "text" ? (
                  <div className="quiz-builder__options">
                    <span className="text-small">
                      Accepted answers. Capitals, extra spaces and punctuation at the ends don’t matter; add other wordings you’d accept.
                    </span>
                    {q.accepted.map((a, j) => (
                      <div key={j} className="quiz-builder__option is-correct">
                        <span className="quiz-builder__pick" aria-hidden>
                          <Icon name="circleCheck" size={16} />
                        </span>
                        <Input
                          aria-label={`Question ${i + 1}, accepted answer ${j + 1}`}
                          placeholder={j === 0 ? "The right answer" : "Another accepted wording"}
                          maxLength={200}
                          value={a}
                          onChange={(e) => setQ(i, { accepted: q.accepted.map((x, k) => (k === j ? e.target.value : x)) })}
                        />
                        {q.accepted.length > 1 && (
                          <IconButton label="Remove accepted answer" size="sm" ghost onClick={() => setQ(i, { accepted: q.accepted.filter((_, k) => k !== j) })}>
                            <Icon name="close" size={13} />
                          </IconButton>
                        )}
                      </div>
                    ))}
                    {q.accepted.length < 10 && (
                      <span>
                        <Button size="sm" variant="link" onClick={() => setQ(i, { accepted: [...q.accepted, ""] })}>
                          + Add another accepted answer
                        </Button>
                      </span>
                    )}
                  </div>
                ) : (
                <div className="quiz-builder__options">
                  {q.options.map((o, j) => (
                    <div key={j} className={cn("quiz-builder__option", q.correct === j && "is-correct")}>
                      <button
                        type="button"
                        className="quiz-builder__pick"
                        aria-label={`Mark answer ${j + 1} as right`}
                        aria-pressed={q.correct === j}
                        onClick={() => setQ(i, { correct: j })}
                      >
                        <Icon name={q.correct === j ? "circleCheck" : "radio"} size={16} />
                      </button>
                      <Input
                        aria-label={`Question ${i + 1}, answer ${j + 1}`}
                        placeholder={`Answer ${j + 1}`}
                        value={o}
                        onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })}
                      />
                      {q.options.length > 2 && (
                        <IconButton
                          label="Remove answer"
                          size="sm"
                          ghost
                          onClick={() =>
                            setQ(i, {
                              options: q.options.filter((_, k) => k !== j),
                              correct: q.correct === j ? 0 : q.correct > j ? q.correct - 1 : q.correct,
                            })
                          }
                        >
                          <Icon name="close" size={13} />
                        </IconButton>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <span>
                      <Button size="sm" variant="link" onClick={() => setQ(i, { options: [...q.options, ""] })}>
                        + Add answer
                      </Button>
                    </span>
                  )}
                </div>
                )}
              </div>
            ))}
            {tried && errors.questions && (
              <p className="text-error" role="alert">
                {errors.questions}
              </p>
            )}
            <div className="course-builder__adds">
              <button type="button" className="course-builder__add" disabled={questions.length >= 50} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
                <Icon name="plus" size={14} /> Multiple-choice question
              </button>
              <button type="button" className="course-builder__add" disabled={questions.length >= 50} onClick={() => setQuestions((qs) => [...qs, blankQuestion("text")])}>
                <Icon name="textShort" size={14} /> Typed-answer question
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
