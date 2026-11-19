"use client";

import { useVaAccess } from "../lib/access";
import { useRef, useState, type ReactNode } from "react";
import { Badge, Button, FormError, Icon, Input, LessonReading, LessonVideo, LoadState, RichTextView, TrainingCover } from "@/components/ui";
import { NextLessonCountdown } from "../components/NextLessonCountdown";
import { cn } from "@/lib/utils";
import { toPlainText, withoutLeadingTitle } from "@/lib/richText";
import { formatShort } from "@/utils/format/dates";
import { formatMinutes, lessonThumb, lessonVideo, VIDEO_PROVIDER_LABEL } from "@/lib/video";
import { lessonFilePath } from "@/utils/api/trainings";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AttemptOut, VaTrainingOut } from "@/utils/api/models";
import { trainingThumbPath } from "@/utils/api/trainings";
import { useEnrollClientTraining, useSaveClientTrainingProgress, useSubmitClientQuiz } from "@/utils/hooks/useClientWork";
import { useEnrollTraining, useMyTrainings, useSaveTrainingProgress, useSubmitQuiz } from "@/utils/hooks/useTrainings";

type Audience = "va" | "client";

/** VA portal › Training: watch each lesson, then pass its quiz. */
export function TrainingSection() {
  const access = useVaAccess();
  const query = useMyTrainings(access.ready);
  return <TrainingList query={query} audience="va" readOnly={access.readOnly} />;
}

/** The courses, then one course's lessons and quiz (VA portal and client portal). */
export function TrainingList({ query, audience, readOnly }: { query: UseQueryResult<VaTrainingOut[]>; audience: Audience; readOnly?: boolean }) {
  const trainings = query.data ?? [];
  const [openId, setOpenId] = useState("");
  const open = trainings.find((t) => t.id === openId) ?? null;

  if (open) return <CourseView key={open.id} training={open} audience={audience} readOnly={readOnly} onBack={() => setOpenId("")} />;

  const passed = trainings.filter((t) => t.myPassed).length;
  const registered = trainings.filter((t) => t.enrolledAt).length;
  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading your trainings…" isEmpty={!trainings.length} empty={audience === "client" ? "No trainings yet. Guides from GoCWGL on working with your VA show up here." : "No trainings yet. New lessons from GoCWGL show up here."}>
        <div className="card stack stack--8">
          <div className="cluster cluster--between">
            <span className="text-strong">
              {passed} of {trainings.length} trainings passed
              <span className="text-small"> · {registered} registered</span>
            </span>
            <span className="text-small">Register for a course, go through the lessons, then take the quiz.</span>
          </div>
          <div className="training-card__bar">
            <span style={{ width: `${trainings.length ? (passed / trainings.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="training-grid training-grid--flush">
          {trainings.map((t) => {
            const thumb = t.lessons[0] ? lessonThumb(t.lessons[0]) : null;
            const uploaded = trainingThumbPath(audience === "client" ? "portal" : "va", t.id, t.thumbnail);
            const length = formatMinutes(t.lessons.reduce((sum, l) => sum + l.minutes, 0));
            return (
              <button key={t.id} type="button" className="training-card" onClick={() => setOpenId(t.id)}>
                <span className={cn("training-card__thumb", !uploaded && !thumb && t.lessons.length > 0 && "is-poster")}>
                  <TrainingCover path={uploaded} poster={thumb} icon={t.lessons.length ? "play" : "graduation"} />
                </span>
                <span className="training-card__body">
                  {t.category && <span className="training-card__category">{t.category}</span>}
                  <span className="training-card__top">
                    <span className="training-card__title">{t.title}</span>
                    <StatusBadge t={t} />
                  </span>
                  <span className="training-card__meta">
                    <span>
                      <Icon name="video" size={12} /> {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
                      {length && ` · ${length}`}
                    </span>
                    <span>
                      <Icon name="survey" size={12} /> {t.questions.length} question{t.questions.length === 1 ? "" : "s"}
                    </span>
                    {t.questions.length > 0 && (
                      <span>
                        <Icon name="gauge" size={12} /> Pass at {t.passingRate}%
                      </span>
                    )}
                    {t.myBestScore !== null && <span>Best {t.myBestScore}%</span>}
                  </span>
                  {t.enrolledAt && t.lessons.length > 0 && (
                    <span className="training-card__progress">
                      <span className="training-card__bar">
                        <span style={{ width: `${(watchedCount(t) / t.lessons.length) * 100}%` }} />
                      </span>
                      <span className="text-small">
                        {watchedCount(t)} of {t.lessons.length} lessons done
                      </span>
                      {t.nextUnlockAt && !t.completedAt && <NextLessonCountdown compact at={t.nextUnlockAt} timezone={t.timezone} />}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </LoadState>
    </div>
  );
}

function StatusBadge({ t }: { t: VaTrainingOut }) {
  if (t.myPassed || t.completedAt) return <Badge tone="green" dot>{t.myPassed ? "Passed" : "Completed"}</Badge>;
  if (t.myTries) return <Badge tone="amber" dot>Try again</Badge>;
  if (t.enrolledAt) return <Badge tone="cyan" dot>Registered</Badge>;
  return <Badge tone="slate" dot>Not registered</Badge>;
}

const statusLabel = (t: VaTrainingOut) =>
  t.myPassed ? "Passed" : t.completedAt ? "Completed" : t.myTries ? "Try again" : t.enrolledAt ? "In progress" : "Not registered";

/** Lessons of this course they've finished (ignores lessons since removed). */
const watchedCount = (t: VaTrainingOut) => t.lessons.filter((l) => t.myWatched.includes(l.id)).length;

/** One course: the lesson video and its card on the left, the course outline on the right; the quiz is the last step. */
function CourseView({
  training: t,
  audience,
  readOnly,
  onBack,
}: {
  training: VaTrainingOut;
  audience: Audience;
  readOnly?: boolean;
  onBack: () => void;
}) {
  const hasQuiz = t.questions.length > 0;
  const steps = t.lessons.length + (hasQuiz ? 1 : 0);
  const enrolled = !!t.enrolledAt;
  // Progress is saved on the server once registered; kept here too so the page answers at once.
  const [watched, setWatched] = useState<string[]>(t.myWatched);
  const vaEnroll = useEnrollTraining();
  const clientEnroll = useEnrollClientTraining();
  const enroll = audience === "client" ? clientEnroll : vaEnroll;
  const vaProgress = useSaveTrainingProgress();
  const clientProgress = useSaveClientTrainingProgress();
  const progress = audience === "client" ? clientProgress : vaProgress;
  const save = (step: number, finished: string[] = []) => {
    if (!enrolled || readOnly) return;
    const currentStep = step === t.lessons.length ? "quiz" : (t.lessons[step]?.id ?? "");
    progress.mutate({ id: t.id, watched: finished, currentStep });
  };
  const markWatched = (lessonId: string, nextStep: number) => {
    setWatched((w) => (w.includes(lessonId) ? w : [...w, lessonId]));
    save(nextStep, [lessonId]);
  };
  // Passing the quiz means the course is done, lessons included.
  const isDone = (i: number) => t.myPassed || watched.includes(t.lessons[i]?.id);
  const [current, setCurrent] = useState(() => {
    if (t.myCurrentStep === "quiz" && hasQuiz) return t.lessons.length;
    const saved = t.lessons.findIndex((l) => l.id === t.myCurrentStep);
    if (saved >= 0) return saved;
    const next = t.lessons.findIndex((l) => !watched.includes(l.id));
    return next >= 0 ? next : hasQuiz ? t.lessons.length : 0;
  });
  // Opening a course shows its dashboard first; "Start", "Continue" or a lesson in the outline opens the lessons.
  const [stage, setStage] = useState<"overview" | "learn">("overview");
  const onQuiz = hasQuiz && current === t.lessons.length;
  const lesson = onQuiz ? null : t.lessons[current];
  const video = lesson ? lessonVideo(lesson) : null;
  // Daily pace: lessons open in order, the next 24 hours after the last is marked complete; the quiz after the last one.
  const firstUndone = t.lessons.findIndex((l) => !watched.includes(l.id));
  const lessonLocked = !!lesson?.locked && !isDone(current);
  const quizLocked = onQuiz && !!t.quizLocked && !t.myPassed;

  const doneCount = t.lessons.filter((_, i) => isDone(i)).length + (hasQuiz && t.myPassed ? 1 : 0);
  const totalMinutes = t.lessons.reduce((sum, l) => sum + l.minutes, 0);

  const top = useRef<HTMLElement>(null);
  const show = (i: number) => {
    setCurrent(i);
    top.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };
  const go = (i: number) => {
    show(i);
    save(i);
  };
  const next = () => {
    const to = Math.min(current + 1, steps - 1);
    if (lesson) markWatched(lesson.id, to);
    show(to);
  };
  const register = () => enroll.mutate(t.id, { onSuccess: () => save(current) });
  const learn = (i: number) => {
    setStage("learn");
    go(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const overview = () => {
    setStage("overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (stage === "overview")
    return (
      <CourseDashboard
        training={t}
        audience={audience}
        readOnly={readOnly}
        watched={watched}
        resume={current}
        doneCount={doneCount}
        steps={steps}
        totalMinutes={totalMinutes}
        enrolling={enroll.isPending}
        enrollError={enroll.error}
        onRegister={register}
        onLearn={learn}
        onBack={onBack}
      />
    );

  const stepLabel = onQuiz ? "Quiz" : `Lesson ${current + 1}`;
  const reading = !!lesson && !video;
  const chips = lesson && (
    <div className="course__chips">
      <span className="course-chip course-chip--step">
        Lesson {current + 1} of {t.lessons.length}
      </span>
      <span className="course-chip course-chip--provider">
        <Icon name={video ? "play" : "form"} size={9} /> {video ? VIDEO_PROVIDER_LABEL[video.provider] : "Reading"}
      </span>
      {reading ? (
        <span className="course__len">
          <Icon name="clock" size={12} /> {formatMinutes(lesson.minutes || readMinutes(lesson.body ?? ""))} read
        </span>
      ) : (
        lesson.minutes > 0 && <span className="course__len">{formatMinutes(lesson.minutes)}</span>
      )}
      {isDone(current) && (
        <span className="course__len course__len--done">
          <Icon name="circleCheck" size={13} /> {video ? "Watched" : "Read"}
        </span>
      )}
    </div>
  );
  const nav = lesson && (
    <div className="course__nav">
      <Button variant="secondary" onClick={() => (current === 0 ? overview() : go(current - 1))}>
        <Icon name="chevronLeft" size={14} /> {current === 0 ? "Course overview" : "Previous"}
      </Button>
      {current < steps - 1 ? (
        <Button variant="primary" onClick={next}>
          {onQuizNext(current, t) ? "Take the quiz" : reading ? "Done reading · next lesson" : "Next lesson"} <Icon name="chevronRight" size={14} />
        </Button>
      ) : (
        <Button variant="primary" onClick={() => (isDone(current) ? overview() : markWatched(lesson.id, current))}>
          {isDone(current) ? "Back to the course" : video ? "Mark as watched" : "Mark as read"} <Icon name={isDone(current) ? "arrowRight" : "check"} size={14} />
        </Button>
      )}
    </div>
  );

  return (
    <div className="page-stack course">
      <nav ref={top} className="course__crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Training
        </button>
        <Icon name="chevronRight" size={12} />
        <button type="button" onClick={overview}>
          {t.title}
        </button>
        <Icon name="chevronRight" size={12} />
        <strong aria-current="page">{stepLabel}</strong>
      </nav>

      <div className="course__layout">
        <div className="course__main">
          {lesson && lessonLocked ? (
            <LockedCard
              title={lesson.title}
              step={`Lesson ${current + 1} of ${t.lessons.length}`}
              message={
                current === firstUndone && t.nextUnlockAt
                  ? `Great work! This lesson opens 24 hours after you finished the last one. It opens on its own when the timer runs out.`
                  : `Finish ${firstUndone >= 0 ? `lesson ${firstUndone + 1}` : "the lessons before it"} first. Lessons open in order${t.dailyLessons ? `, ${t.dailyLessons} per 24 hours` : ""}.`
              }
              countdown={t.nextUnlockAt ? <NextLessonCountdown at={t.nextUnlockAt} timezone={t.timezone} /> : undefined}
              onPrevious={current > 0 ? () => go(current - 1) : undefined}
            />
          ) : quizLocked ? (
            <LockedCard
              title="Quiz"
              step="Last step"
              message="Finish every lesson first, then take the quiz."
              countdown={t.nextUnlockAt ? <NextLessonCountdown at={t.nextUnlockAt} timezone={t.timezone} /> : undefined}
              onPrevious={t.lessons.length ? () => go(t.lessons.length - 1) : undefined}
            />
          ) : lesson && video ? (
            <>
              <LessonVideo key={lesson.id} video={video} title={lesson.title} className="course__video" />
              <section className="card course__lesson">
                <FormError error={progress.error} />
                {readOnly && !enrolled && <p className="text-small">Viewing only: progress isn’t saved.</p>}
                {chips}
                <h2 className="course__title">{lesson.title}</h2>
                {lesson.summary && <p className="course__summary">{lesson.summary}</p>}
                {nav}
              </section>
            </>
          ) : lesson ? (
            <article key={lesson.id} className="card reading-lesson">
              <header className="reading-lesson__head">
                <span className="reading-lesson__badge" aria-hidden="true">
                  <Icon name="form" size={20} />
                </span>
                {chips}
                <h1 className="reading-lesson__title">{lesson.title}</h1>
                {lesson.summary && <p className="reading-lesson__lede">{lesson.summary}</p>}
              </header>
              <FormError error={progress.error} />
              {readOnly && !enrolled && <p className="text-small">Viewing only: progress isn’t saved.</p>}
              <LessonReading
                title={lesson.title}
                body={withoutLeadingTitle(lesson.body ?? "", lesson.title)}
                file={lesson.file}
                filePath={lesson.file ? lessonFilePath(audience === "client" ? "portal" : "va", t.id, lesson.file.id) : null}
                className="reading-lesson__content"
              />
              <footer className="reading-lesson__foot">
                {!isDone(current) && <span className="reading-lesson__end">You’ve reached the end of this reading.</span>}
                {nav}
              </footer>
            </article>
          ) : hasQuiz ? (
            <QuizCard
              key={t.id}
              training={t}
              audience={audience}
              readOnly={readOnly || !enrolled}
              onPrevious={t.lessons.length ? () => go(t.lessons.length - 1) : undefined}
              onDone={overview}
            />
          ) : (
            <section className="card course__lesson">
              <p className="vp-empty">No lessons in this training yet.</p>
            </section>
          )}
        </div>

        <aside className="card course__side">
          <header className="course__head">
            <span className="course__kicker">
              {t.category || "Training"} · {statusLabel(t)}
            </span>
            <h3>{t.title}</h3>
            <span className="course__sub">
              {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
              {totalMinutes > 0 && ` · ${formatMinutes(totalMinutes)}`}
              {hasQuiz && ` · quiz`}
            </span>
          </header>
          <div className="course__progress">
            {enrolled && <span className="text-small">Registered {formatShort(t.enrolledAt!)}</span>}
            <span className="cluster cluster--between">
              <span>Course progress</span>
              <strong>
                {doneCount} / {steps}
              </strong>
            </span>
            <span className="course__bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={doneCount} aria-label="Course progress">
              <span style={{ width: `${steps ? (doneCount / steps) * 100 : 0}%` }} />
            </span>
            {enrolled && t.nextUnlockAt && <NextLessonCountdown compact at={t.nextUnlockAt} timezone={t.timezone} />}
          </div>
          <ol className="course__outline">
            {t.lessons.map((l, i) => (
              <li key={l.id}>
                <button type="button" aria-current={i === current ? "step" : undefined} className={cn(isDone(i) && "is-done")} onClick={() => go(i)}>
                  <span className="course__n">
                    {isDone(i) && i !== current ? <Icon name="check" size={12} /> : l.locked && !isDone(i) ? <Icon name="lock" size={11} /> : i + 1}
                  </span>
                  <span className="course__item">
                    <span className="course__item-title">{l.title}</span>
                    <span className="course__item-meta">
                      {l.kind !== "reading" && l.provider ? VIDEO_PROVIDER_LABEL[l.provider] : "Reading"}
                      {l.minutes > 0 && ` · ${formatMinutes(l.minutes)}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {hasQuiz && (
              <li>
                <button
                  type="button"
                  aria-current={onQuiz ? "step" : undefined}
                  className={cn(t.myPassed && "is-done")}
                  onClick={() => go(t.lessons.length)}
                >
                  <span className="course__n">{t.myPassed && !onQuiz ? <Icon name="check" size={12} /> : <Icon name="survey" size={12} />}</span>
                  <span className="course__item">
                    <span className="course__item-title">Quiz</span>
                    <span className="course__item-meta">
                      {t.questions.length} question{t.questions.length === 1 ? "" : "s"} · pass at {t.passingRate}%
                      {t.myBestScore !== null && ` · best ${t.myBestScore}%`}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </ol>
          <button type="button" className="course__overview-link" onClick={overview}>
            <Icon name="graduation" size={13} /> Course overview
          </button>
        </aside>
      </div>
    </div>
  );
}

/** Daily pace: a lesson (or the quiz) that isn't open yet, and when it will be. */
function LockedCard({
  title,
  step,
  message,
  countdown,
  onPrevious,
}: {
  title: string;
  step: string;
  message: string;
  countdown?: ReactNode;
  onPrevious?: () => void;
}) {
  return (
    <section className="card course__lesson course__locked">
      <span className="course__locked-icon" aria-hidden="true">
        <Icon name="lock" size={20} />
      </span>
      <div className="course__chips">
        <span className="course-chip course-chip--step">{step}</span>
      </div>
      <h2 className="course__title">{title}</h2>
      <p className="course__summary">{message}</p>
      {countdown}
      {onPrevious && (
        <div className="course__nav">
          <Button variant="secondary" onClick={onPrevious}>
            <Icon name="chevronLeft" size={14} /> Previous
          </Button>
        </div>
      )}
    </section>
  );
}

/** About 200 words a minute, for readings without a length set. */
function readMinutes(body: string): number {
  const words = toPlainText(body).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * A course's dashboard, shown first whenever it's opened: its cover, what it's about, how far along they are, and
 * the button to register, start, continue or review; the outline below opens any lesson.
 */
function CourseDashboard({
  training: t,
  audience,
  readOnly,
  watched,
  resume,
  doneCount,
  steps,
  totalMinutes,
  enrolling,
  enrollError,
  onRegister,
  onLearn,
  onBack,
}: {
  training: VaTrainingOut;
  audience: Audience;
  readOnly?: boolean;
  watched: string[];
  resume: number;
  doneCount: number;
  steps: number;
  totalMinutes: number;
  enrolling: boolean;
  enrollError: unknown;
  onRegister: () => void;
  onLearn: (step: number) => void;
  onBack: () => void;
}) {
  const enrolled = !!t.enrolledAt;
  const hasQuiz = t.questions.length > 0;
  const canOpen = enrolled || !!readOnly;
  const finished = t.myPassed || !!t.completedAt;
  const started = doneCount > 0 || !!t.myCurrentStep || t.myTries > 0;
  const pct = steps ? Math.round((doneCount / steps) * 100) : 0;
  const cover = trainingThumbPath(audience === "client" ? "portal" : "va", t.id, t.thumbnail);
  const poster = t.lessons[0] ? lessonThumb(t.lessons[0]) : null;
  const isDone = (i: number) => t.myPassed || watched.includes(t.lessons[i]?.id);
  // The description in full (with its formatting) goes in "About this course"; the hero shows its opening words.
  // Lines (paragraphs, list items) joined as sentences, so bullet points don't run together.
  const aboutText = toPlainText(t.description ?? "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((l) => (/[.!?:…]$/.test(l) ? l : `${l}.`))
    .join(" ");
  const excerpt = aboutText.length > 220 ? `${aboutText.slice(0, 220).replace(/\s+\S*$/, "")}…` : aboutText;
  const hasAbout = !!aboutText;
  const nextLabel = resume >= t.lessons.length ? "Quiz" : `Lesson ${resume + 1} · ${t.lessons[resume]?.title ?? ""}`;

  const cta = !canOpen
    ? { label: enrolling ? "Registering…" : "Register for this course", icon: "arrowRight" as const, onClick: onRegister }
    : !enrolled
      ? { label: "Preview the course", icon: "play" as const, onClick: () => onLearn(0) }
      : finished
        ? { label: "Review the course", icon: "arrowRight" as const, onClick: () => onLearn(0) }
        : started
          ? { label: "Continue the course", icon: "play" as const, onClick: () => onLearn(resume) }
          : { label: "Start the course", icon: "play" as const, onClick: () => onLearn(resume) };

  return (
    <div className="page-stack course course-dash">
      <nav className="course__crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Training
        </button>
        {t.category && (
          <>
            <Icon name="chevronRight" size={12} />
            <span>{t.category}</span>
          </>
        )}
        <Icon name="chevronRight" size={12} />
        <strong aria-current="page">{t.title}</strong>
      </nav>

      <section className="card course-dash__hero">
        <div className={cn("course-dash__cover", !cover && !poster && "is-poster")}>
          <TrainingCover path={cover} poster={poster} icon="graduation" iconSize={40} />
          <span className="course-dash__status">
            <StatusBadge t={t} />
          </span>
        </div>
        <div className="course-dash__intro">
          <span className="course-dash__kicker">{t.category || "Training"}</span>
          <h1 className="course-dash__title">{t.title}</h1>
          <p className="course-dash__lede">{excerpt || "Go through the lessons in order. Your progress is saved as you go."}</p>
          <ul className="course-dash__facts">
            <li>
              <Icon name="video" size={14} />
              <span>
                <strong>{t.lessons.length}</strong> lesson{t.lessons.length === 1 ? "" : "s"}
              </span>
            </li>
            {totalMinutes > 0 && (
              <li>
                <Icon name="clock" size={14} />
                <span>
                  <strong>{formatMinutes(totalMinutes)}</strong> in all
                </span>
              </li>
            )}
            {hasQuiz && (
              <li>
                <Icon name="survey" size={14} />
                <span>
                  Quiz · pass at <strong>{t.passingRate}%</strong>
                </span>
              </li>
            )}
            {(t.dailyLessons ?? 0) > 0 && (
              <li>
                <Icon name="calendar" size={14} />
                <span>
                  <strong>{t.dailyLessons}</strong> lesson{t.dailyLessons === 1 ? "" : "s"} per 24 hours
                </span>
              </li>
            )}
          </ul>

          {enrolled && (
            <div className="course-dash__progress">
              <span className="cluster cluster--between">
                <span>
                  {finished ? (t.myPassed ? "Passed" : "Completed") : started ? `Up next: ${nextLabel}` : "Ready when you are"}
                </span>
                <strong>{pct}%</strong>
              </span>
              <span className="course__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Course progress">
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="text-small">
                {doneCount} of {steps} step{steps === 1 ? "" : "s"} done · registered {formatShort(t.enrolledAt!)}
                {t.myBestScore !== null && ` · best quiz score ${t.myBestScore}%`}
              </span>
            </div>
          )}

          {enrolled && !finished && t.nextUnlockAt && <NextLessonCountdown at={t.nextUnlockAt} timezone={t.timezone} />}
          <FormError error={enrollError} />
          <div className="course-dash__actions">
            <Button variant="primary" size="lg" disabled={enrolling || !steps} onClick={cta.onClick}>
              {cta.label} <Icon name={cta.icon} size={14} />
            </Button>
            <Button variant="secondary" size="lg" onClick={onBack}>
              All trainings
            </Button>
          </div>
          {!canOpen && <span className="text-small">Registering lets GoCWGL see your progress and help if you get stuck.</span>}
        </div>
      </section>

      {hasAbout && (
        <section className="card course-dash__about">
          <header className="course-dash__about-head">
            <span className="course-dash__about-icon" aria-hidden="true">
              <Icon name="textLong" size={16} />
            </span>
            <span className="stack stack--0">
              <h2 className="course-dash__h2">About this course</h2>
              <span className="text-small">What you’ll learn and why it matters</span>
            </span>
          </header>
          <RichTextView body={t.description} className="course-dash__about-body" />
        </section>
      )}

      <section className="card course-dash__outline">
        <header className="cluster cluster--between">
          <h2 className="course-dash__h2">What’s inside</h2>
          <span className="text-small">
            {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
            {hasQuiz && " · 1 quiz"}
          </span>
        </header>
        <ol className="course-dash__list">
          {t.lessons.map((l, i) => {
            const done = enrolled && isDone(i);
            const locked = !!l.locked && !done;
            const reading = l.kind === "reading";
            return (
              <li key={l.id}>
                <button type="button" className={cn("course-dash__row", done && "is-done", i === resume && enrolled && !finished && "is-next")} disabled={!canOpen} onClick={() => onLearn(i)}>
                  <span className="course-dash__n">{done ? <Icon name="check" size={13} /> : locked && enrolled ? <Icon name="lock" size={12} /> : i + 1}</span>
                  <span className="course-dash__row-main">
                    <span className="course-dash__row-title">{l.title}</span>
                    {l.summary && <span className="course-dash__row-sum">{l.summary}</span>}
                  </span>
                  <span className="course-dash__row-meta">
                    <Icon name={reading ? "form" : "play"} size={12} />
                    {reading ? "Reading" : l.provider ? VIDEO_PROVIDER_LABEL[l.provider] : "Video"}
                    {l.minutes > 0 && ` · ${formatMinutes(l.minutes)}`}
                  </span>
                </button>
              </li>
            );
          })}
          {hasQuiz && (
            <li>
              <button type="button" className={cn("course-dash__row", t.myPassed && "is-done", resume === t.lessons.length && enrolled && !finished && "is-next")} disabled={!canOpen} onClick={() => onLearn(t.lessons.length)}>
                <span className="course-dash__n">{t.myPassed ? <Icon name="check" size={13} /> : <Icon name="survey" size={13} />}</span>
                <span className="course-dash__row-main">
                  <span className="course-dash__row-title">Final quiz</span>
                  <span className="course-dash__row-sum">
                    {t.questions.length} question{t.questions.length === 1 ? "" : "s"} · pass at {t.passingRate}%
                  </span>
                </span>
                <span className="course-dash__row-meta">{t.myBestScore !== null ? `Best ${t.myBestScore}%` : "Quiz"}</span>
              </button>
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}

/** The step after this lesson is the quiz. */
const onQuizNext = (i: number, t: VaTrainingOut) => t.questions.length > 0 && i === t.lessons.length - 1;

function QuizCard({
  training: t,
  audience,
  readOnly,
  onPrevious,
  onDone,
}: {
  training: VaTrainingOut;
  audience: Audience;
  readOnly?: boolean;
  onPrevious?: () => void;
  onDone: () => void;
}) {
  const vaSubmit = useSubmitQuiz();
  const clientSubmit = useSubmitClientQuiz();
  const submit = audience === "client" ? clientSubmit : vaSubmit;
  const [answers, setAnswers] = useState<Array<number | string | null>>(() => t.questions.map(() => null));
  const [result, setResult] = useState<AttemptOut | null>(null);
  const unanswered = answers.filter((a) => a === null || (typeof a === "string" && !a.trim())).length;
  const answer = (i: number, value: number | string) => setAnswers((a) => a.map((x, k) => (k === i ? value : x)));

  const send = () =>
    submit.mutate({ id: t.id, answers: answers.map((a) => (typeof a === "string" ? a.trim() : a)) }, { onSuccess: (r) => setResult(r) });
  const retry = () => {
    setAnswers(t.questions.map(() => null));
    setResult(null);
  };

  return (
    <section className="card course__lesson course__quiz">
      <div className="course__chips">
        <span className="course-chip course-chip--step">Quiz</span>
        <span className="course__len">
          {t.questions.length} question{t.questions.length === 1 ? "" : "s"} · pass at {t.passingRate}%
        </span>
        {t.myBestScore !== null && <span className="course__len">Best so far {t.myBestScore}%</span>}
      </div>
      <h2 className="course__title">Check what you learned</h2>
      <p className="course__summary">Answer every question, then submit. You can retake it as many times as you need.</p>

      <div className="va-quiz">
        <FormError error={submit.error} />
        {result && (
          <div className={cn("va-quiz__result", result.passed ? "is-pass" : "is-fail")} role="status">
            <Icon name={result.passed ? "circleCheck" : "circleX"} size={28} />
            <span className="stack stack--2">
              <strong>{result.score}%</strong>
              <span>
                {result.passed
                  ? `You passed! ${result.correct} of ${result.total} right.`
                  : `${result.correct} of ${result.total} right. You need ${result.passingRate}% to pass — go over the lessons again and retry.`}
              </span>
            </span>
          </div>
        )}
        {t.questions.map((q, i) => {
          const verdict = result?.results[i];
          return (
            <fieldset key={q.id} className={cn("va-quiz__q", verdict === true && "is-right", verdict === false && "is-wrong")} disabled={!!result}>
              <legend className="va-quiz__text">
                {i + 1}. {q.text}
                {verdict !== undefined && <Icon name={verdict ? "circleCheck" : "circleX"} size={15} />}
              </legend>
              {q.kind === "text" ? (
                <Input
                  aria-label={`Your answer to question ${i + 1}`}
                  placeholder="Type your answer"
                  maxLength={300}
                  value={typeof answers[i] === "string" ? (answers[i] as string) : ""}
                  onChange={(e) => answer(i, e.target.value)}
                />
              ) : (
                q.options.map((o, j) => (
                  <label key={j} className="va-quiz__option">
                    <input type="radio" name={`q-${q.id}`} checked={answers[i] === j} onChange={() => answer(i, j)} />
                    {o}
                  </label>
                ))
              )}
            </fieldset>
          );
        })}
      </div>

      <div className="course__nav">
        <Button variant="secondary" disabled={!onPrevious} onClick={onPrevious}>
          <Icon name="chevronLeft" size={14} /> Previous
        </Button>
        {result ? (
          result.passed ? (
            <Button variant="primary" onClick={onDone}>
              Back to trainings <Icon name="arrowRight" size={14} />
            </Button>
          ) : (
            <Button variant="primary" onClick={retry}>
              Try again
            </Button>
          )
        ) : (
          <Button variant="primary" disabled={readOnly || unanswered > 0 || submit.isPending} onClick={send}>
            {submit.isPending ? "Checking…" : unanswered ? `${unanswered} question${unanswered === 1 ? "" : "s"} left` : "Submit answers"}
          </Button>
        )}
      </div>
    </section>
  );
}
