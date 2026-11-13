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
  type IconName,
} from "@/components/ui";
import { customCategories, TRAINING_CATEGORIES } from "@/data/trainingCategories";
import { toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { youtubeId, youtubeThumb } from "@/lib/youtube";
import type { QuestionIn, TrainingAudience, TrainingOut, TrainingStatus } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import {
  useCreateTraining,
  useDeleteTraining,
  useTrainingResults,
  useTrainingStats,
  useTrainings,
  useUpdateTraining,
} from "@/utils/hooks/useTrainings";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

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

/** First lesson's video, for thumbnails. */
const coverId = (t: TrainingOut) => t.lessons[0]?.videoId ?? "";

/** Engagement › Training: courses of YouTube lessons for VAs and clients; VAs pass a quiz at your passing rate. */
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
                {inTab.length ? "Try another search or filter." : "Add YouTube lessons, a few quiz questions and the score needed to pass."}
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
                    {coverId(t) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed
                      <img src={youtubeThumb(coverId(t))} alt="" loading="lazy" />
                    ) : (
                      <Icon name="graduation" size={28} />
                    )}
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
                    {tab === "va" && <th>VAs passed</th>}
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <button type="button" className="cell-button course-table__course" onClick={() => setOpenId(t.id)}>
                          {coverId(t) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                            <img src={youtubeThumb(coverId(t))} alt="" loading="lazy" />
                          ) : (
                            <span className="course-table__ph">
                              <Icon name="graduation" size={16} />
                            </span>
                          )}
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
  const results = useTrainingResults(t.audience === "va" ? t.id : "");
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
                  <ul>
                    {q.options.map((o, j) => (
                      <li key={j} className={cn(j === q.correct && "is-correct")}>
                        <Icon name={j === q.correct ? "circleCheck" : "radio"} size={14} />
                        {o}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}

        {t.audience === "va" && t.questions.length > 0 && (
          <div className="stack stack--8">
            <span className="kicker">VA RESULTS</span>
            <LoadState query={results} isEmpty={!results.data?.length} empty="No VA has taken the quiz yet." inline>
              <table className="data-table data-table--plain">
                <thead>
                  <tr>
                    <th>VA</th>
                    <th>Best score</th>
                    <th>Tries</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.data?.map((r) => (
                    <tr key={r.userId}>
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{r.name}</span>
                          <span className="text-small">{r.email}</span>
                        </div>
                      </td>
                      <td>{r.bestScore}%</td>
                      <td>
                        {r.tries} · last {formatShort(r.lastAttemptAt)}
                      </td>
                      <td>
                        <Badge tone={r.passed ? "green" : "red"} dot>
                          {r.passed ? "Passed" : "Not passed yet"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LoadState>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Editor

type DraftLesson = { key: string; id: string; title: string; videoUrl: string };
const blankLesson = (): DraftLesson => ({ key: crypto.randomUUID(), id: "", title: "", videoUrl: "" });

type DraftQuestion = QuestionIn & { key: string };
const blankQuestion = (): DraftQuestion => ({ key: crypto.randomUUID(), id: "", text: "", options: ["", ""], correct: 0 });

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
  const isNew = !training;
  const [f, setF] = useState({
    audience: training?.audience ?? audience,
    title: training?.title ?? "",
    category: training?.category ?? "",
    description: training?.description ?? "",
    rate: String(training?.passingRate ?? 80),
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    training?.questions.length ? training.questions.map((q) => ({ ...q, key: q.id })) : [blankQuestion()],
  );
  const [lessons, setLessons] = useState<DraftLesson[]>(
    training?.lessons.length ? training.lessons.map((l) => ({ key: l.id, id: l.id, title: l.title, videoUrl: l.videoUrl })) : [blankLesson()],
  );
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));
  const setL = (i: number, patch: Partial<DraftLesson>) => setLessons((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const moveL = (i: number, by: number) =>
    setLessons((ls) => {
      const next = [...ls];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const usedLessons = lessons.filter((l) => l.title.trim() || l.videoUrl.trim());
  const badLesson = usedLessons.findIndex((l) => !youtubeId(l.videoUrl));
  const setQ = (i: number, patch: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const rate = Number(f.rate);
  // Questions that are entirely empty are skipped; partly filled ones must be complete.
  const used = questions.filter((q) => q.text.trim() || q.options.some((o) => o.trim()));
  const qError = used.findIndex((q) => !q.text.trim() || q.options.filter((o) => o.trim()).length < 2 || !q.options[q.correct]?.trim());
  const errors = {
    title: !f.title.trim() ? "Give the training a title." : "",
    lessons: badLesson >= 0 ? `Lesson ${lessons.indexOf(usedLessons[badLesson]) + 1}: paste a YouTube link (youtube.com/watch?v=… or youtu.be/…).` : "",
    rate: !Number.isInteger(rate) || rate < 1 || rate > 100 ? "A whole number from 1 to 100." : "",
    questions: qError >= 0 ? `Question ${questions.indexOf(used[qError]) + 1} needs its text, at least two answers, and the right one picked.` : "",
  };
  const pending = create.isPending || save.isPending;

  const submit = (status?: TrainingStatus) => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    const body = {
      title: f.title.trim(),
      audience: f.audience,
      category: f.category.trim(),
      lessons: usedLessons.map((l) => ({ id: l.id, title: l.title.trim(), videoUrl: l.videoUrl.trim() })),
      description: f.description.trim(),
      passingRate: rate,
      questions: used.map((q) => {
        // Drop blank answers but keep the right one pointing at the same text.
        const kept = q.options.map((o, j) => ({ o: o.trim(), j })).filter((x) => x.o);
        return { id: q.id, text: q.text.trim(), options: kept.map((x) => x.o), correct: kept.findIndex((x) => x.j === q.correct) };
      }),
      ...(status && { status }),
    };
    const done = (t: TrainingOut) => {
      notify(isNew ? (t.status === "published" ? `“${t.title}” is published.` : `“${t.title}” is saved as a draft.`) : `“${t.title}” is saved.`);
      onSaved(t);
    };
    if (isNew) create.mutate({ ...body, status: status ?? "draft" }, { onSuccess: done });
    else save.mutate({ id: training.id, body }, { onSuccess: done });
  };

  return (
    <Modal
      open
      variant="drawer"
      width={700}
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
      titleId="training-editor"
      kicker="TRAINING"
      title={isNew ? "New training" : "Edit training"}
      subtitle="YouTube lessons, then a quiz. VAs pass when they reach the passing rate."
      media={
        <IconTile brand size="lg">
          <Icon name="graduation" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          {isNew ? (
            <>
              <Button type="submit" variant="outline" disabled={pending}>
                Save as draft
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => submit("published")}>
                <Icon name="send" size={13} /> Publish
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
      <div className="stack stack--14">
        <FormError error={create.error ?? save.error} />
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
        <Field label="Title" htmlFor="tr-title" required error={tried && errors.title}>
          <Input id="tr-title" placeholder="Inbox management basics" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        </Field>
        <Field label="Category" htmlFor="tr-cat" hint="Groups courses on this page and in the portal.">
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
        <Field label="Description" htmlFor="tr-desc">
          <Textarea id="tr-desc" rows={3} placeholder="What they'll learn and why it matters." value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="quiz-builder">
          <span className="stack stack--2">
            <span className="text-strong">Lessons</span>
            <span className="text-small">YouTube videos, watched in this order. Unlisted videos work too.</span>
          </span>
          {lessons.map((l, i) => {
            const id = youtubeId(l.videoUrl);
            return (
              <div key={l.key} className="lesson-row">
                <span className="lesson-row__thumb">
                  {id ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                    <img src={youtubeThumb(id)} alt="" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </span>
                <span className="lesson-row__fields">
                  <Input aria-label={`Lesson ${i + 1} title`} placeholder={`Lesson ${i + 1} title`} value={l.title} onChange={(e) => setL(i, { title: e.target.value })} />
                  <Input
                    aria-label={`Lesson ${i + 1} YouTube link`}
                    type="url"
                    placeholder="https://youtu.be/…"
                    value={l.videoUrl}
                    aria-invalid={tried && !!l.videoUrl.trim() && !id}
                    onChange={(e) => setL(i, { videoUrl: e.target.value })}
                  />
                </span>
                <span className="sop-step-editor__tools">
                  <IconButton label="Move up" size="sm" ghost disabled={i === 0} onClick={() => moveL(i, -1)}>
                    <Icon name="chevronUp" size={14} />
                  </IconButton>
                  <IconButton label="Move down" size="sm" ghost disabled={i === lessons.length - 1} onClick={() => moveL(i, 1)}>
                    <Icon name="chevronDown" size={14} />
                  </IconButton>
                  <IconButton label="Remove lesson" size="sm" ghost onClick={() => setLessons((ls) => ls.filter((_, j) => j !== i))}>
                    <Icon name="close" size={14} />
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
          <span>
            <Button size="sm" variant="outline" disabled={lessons.length >= 100} onClick={() => setLessons((ls) => [...ls, blankLesson()])}>
              <Icon name="plus" size={13} /> Add lesson
            </Button>
          </span>
        </div>

        <div className="quiz-builder">
          <div className="cluster cluster--between">
            <span className="stack stack--2">
              <span className="text-strong">Quiz</span>
              <span className="text-small">Click the circle beside the right answer.</span>
            </span>
            <Field label="Passing rate" htmlFor="tr-rate" error={tried && errors.rate} className="quiz-builder__rate">
              <span className="quiz-builder__pct">
                <Input id="tr-rate" inputMode="numeric" value={f.rate} onChange={(e) => set({ rate: e.target.value })} />
                <span>%</span>
              </span>
            </Field>
          </div>

          {questions.map((q, i) => (
            <div key={q.key} className="quiz-builder__q">
              <div className="cluster cluster--nowrap">
                <span className="sop-steps__n">{i + 1}</span>
                <Input aria-label={`Question ${i + 1}`} placeholder="Question" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                <IconButton label="Remove question" size="sm" ghost onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                  <Icon name="trash" size={14} />
                </IconButton>
              </div>
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
            </div>
          ))}
          {tried && errors.questions && (
            <p className="text-error" role="alert">
              {errors.questions}
            </p>
          )}
          <span>
            <Button size="sm" variant="outline" disabled={questions.length >= 50} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
              <Icon name="plus" size={13} /> Add question
            </Button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
