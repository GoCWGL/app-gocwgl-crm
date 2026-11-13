"use client";

import { useVaAccess } from "../lib/access";
import { useRef, useState } from "react";
import { Badge, Button, FormError, Icon, Input, LessonVideo, LoadState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { formatMinutes, lessonThumb, VIDEO_PROVIDER_LABEL } from "@/lib/video";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AttemptOut, VaTrainingOut } from "@/utils/api/models";
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
            <span className="text-small">Register for a course, watch the lessons, then take the quiz.</span>
          </div>
          <div className="training-card__bar">
            <span style={{ width: `${trainings.length ? (passed / trainings.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="training-grid training-grid--flush">
          {trainings.map((t) => {
            const thumb = t.lessons[0] ? lessonThumb(t.lessons[0]) : null;
            const length = formatMinutes(t.lessons.reduce((sum, l) => sum + l.minutes, 0));
            return (
              <button key={t.id} type="button" className="training-card" onClick={() => setOpenId(t.id)}>
                <span className={cn("training-card__thumb", !thumb && t.lessons.length > 0 && "is-poster")}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                    <img src={thumb} alt="" loading="lazy" />
                  ) : (
                    <Icon name={t.lessons.length ? "play" : "graduation"} size={28} />
                  )}
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
                        {watchedCount(t)} of {t.lessons.length} lessons watched
                      </span>
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
  const locked = !enrolled && !readOnly;
  const onQuiz = hasQuiz && current === t.lessons.length;
  const lesson = onQuiz ? null : t.lessons[current];

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

  return (
    <div className="page-stack course">
      <nav ref={top} className="course__crumbs" aria-label="Breadcrumb">
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

      <div className="course__layout">
        <div className="course__main">
          {locked ? (
            <RegisterCard training={t} totalMinutes={totalMinutes} pending={enroll.isPending} error={enroll.error} onRegister={register} />
          ) : lesson ? (
            <>
              <LessonVideo key={lesson.id} video={lesson} title={lesson.title} className="course__video" />
              <section className="card course__lesson">
                <FormError error={progress.error} />
                {readOnly && !enrolled && <p className="text-small">Viewing only: progress isn’t saved.</p>}
                <div className="course__chips">
                  <span className="course-chip course-chip--step">
                    Lesson {current + 1} of {t.lessons.length}
                  </span>
                  <span className="course-chip course-chip--provider">
                    <Icon name="play" size={9} /> {VIDEO_PROVIDER_LABEL[lesson.provider]}
                  </span>
                  {lesson.minutes > 0 && <span className="course__len">{formatMinutes(lesson.minutes)}</span>}
                  {isDone(current) && (
                    <span className="course__len course__len--done">
                      <Icon name="circleCheck" size={13} /> Watched
                    </span>
                  )}
                </div>
                <h2 className="course__title">{lesson.title}</h2>
                {lesson.summary && <p className="course__summary">{lesson.summary}</p>}
                <div className="course__nav">
                  <Button variant="secondary" disabled={current === 0} onClick={() => go(current - 1)}>
                    <Icon name="chevronLeft" size={14} /> Previous
                  </Button>
                  {current < steps - 1 ? (
                    <Button variant="primary" onClick={next}>
                      {onQuizNext(current, t) ? "Take the quiz" : "Next lesson"} <Icon name="chevronRight" size={14} />
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => (isDone(current) ? onBack() : markWatched(lesson.id, current))}>
                      {isDone(current) ? "Back to trainings" : "Mark as watched"} <Icon name={isDone(current) ? "arrowRight" : "check"} size={14} />
                    </Button>
                  )}
                </div>
              </section>
            </>
          ) : hasQuiz ? (
            <QuizCard
              key={t.id}
              training={t}
              audience={audience}
              readOnly={readOnly || !enrolled}
              onPrevious={t.lessons.length ? () => go(t.lessons.length - 1) : undefined}
              onDone={onBack}
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
          {locked ? (
            <div className="course__progress">
              <span>Register to start this course. Your progress is saved as you go, so you can pick up where you left off.</span>
              <Button variant="primary" block disabled={enroll.isPending} onClick={register}>
                {enroll.isPending ? "Registering…" : "Register for this course"}
              </Button>
            </div>
          ) : (
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
            </div>
          )}
          <ol className="course__outline">
            {t.lessons.map((l, i) => (
              <li key={l.id}>
                <button type="button" aria-current={i === current ? "step" : undefined} className={cn(isDone(i) && "is-done")} onClick={() => go(i)}>
                  <span className="course__n">{isDone(i) && i !== current ? <Icon name="check" size={12} /> : i + 1}</span>
                  <span className="course__item">
                    <span className="course__item-title">{l.title}</span>
                    <span className="course__item-meta">
                      {VIDEO_PROVIDER_LABEL[l.provider]}
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
          {t.description && !locked && <p className="course__about va-pre">{t.description}</p>}
        </aside>
      </div>
    </div>
  );
}

/** Before registering: what the course covers, and the button. */
function RegisterCard({
  training: t,
  totalMinutes,
  pending,
  error,
  onRegister,
}: {
  training: VaTrainingOut;
  totalMinutes: number;
  pending: boolean;
  error: unknown;
  onRegister: () => void;
}) {
  return (
    <section className="card course__register">
      <span className="course__register-icon">
        <Icon name="graduation" size={26} />
      </span>
      <div className="course__chips">
        <span className="course-chip course-chip--step">
          {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
        </span>
        {totalMinutes > 0 && <span className="course-chip course-chip--provider">{formatMinutes(totalMinutes)}</span>}
        {t.questions.length > 0 && <span className="course__len">Quiz · pass at {t.passingRate}%</span>}
      </div>
      <h2 className="course__title">{t.title}</h2>
      <p className="course__summary">{t.description || "Register to start the lessons. Your progress is saved as you go."}</p>
      <FormError error={error} />
      <div className="course__nav">
        <span className="text-small">Registering lets GoCWGL see your progress and help if you get stuck.</span>
        <Button variant="primary" disabled={pending} onClick={onRegister}>
          {pending ? "Registering…" : "Register for this course"} <Icon name="arrowRight" size={14} />
        </Button>
      </div>
    </section>
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
                  : `${result.correct} of ${result.total} right. You need ${result.passingRate}% to pass — rewatch the lessons and try again.`}
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
