"use client";

import { useVaAccess } from "../lib/access";
import { useRef, useState } from "react";
import { Badge, Button, FormError, Icon, LessonVideo, LoadState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatMinutes, lessonThumb, VIDEO_PROVIDER_LABEL } from "@/lib/video";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AttemptOut, VaTrainingOut } from "@/utils/api/models";
import { useSubmitClientQuiz } from "@/utils/hooks/useClientWork";
import { useMyTrainings, useSubmitQuiz } from "@/utils/hooks/useTrainings";

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
  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading your trainings…" isEmpty={!trainings.length} empty={audience === "client" ? "No trainings yet. Guides from GoCWGL on working with your VA show up here." : "No trainings yet. New lessons from GoCWGL show up here."}>
        <div className="card stack stack--8">
          <div className="cluster cluster--between">
            <span className="text-strong">
              {passed} of {trainings.length} trainings passed
            </span>
            <span className="text-small">Watch the lessons, then take the quiz.</span>
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
  if (t.myPassed) return <Badge tone="green" dot>Passed</Badge>;
  if (t.myTries) return <Badge tone="amber" dot>Try again</Badge>;
  return <Badge tone="slate" dot>Not started</Badge>;
}

const statusLabel = (t: VaTrainingOut) => (t.myPassed ? "Passed" : t.myTries ? "Try again" : "In progress");

/** Lessons you've finished in this course, kept on this device (only quiz results are saved on the server). */
function useWatched(trainingId: string) {
  const storageKey = `gocwgl.training.${trainingId}.watched`;
  const [watched, setWatched] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const markWatched = (lessonId: string) =>
    setWatched((w) => {
      if (w.includes(lessonId)) return w;
      const next = [...w, lessonId];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Private mode / full storage: progress just isn't remembered.
      }
      return next;
    });
  return [watched, markWatched] as const;
}

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
  const [watched, markWatched] = useWatched(t.id);
  // Passing the quiz means the course is done, lessons included.
  const isDone = (i: number) => t.myPassed || watched.includes(t.lessons[i]?.id);
  const [current, setCurrent] = useState(() => {
    if (t.myTries && hasQuiz) return t.lessons.length;
    const next = t.lessons.findIndex((l) => !watched.includes(l.id));
    return next >= 0 ? next : hasQuiz ? t.lessons.length : 0;
  });
  const onQuiz = hasQuiz && current === t.lessons.length;
  const lesson = onQuiz ? null : t.lessons[current];

  const doneCount = t.lessons.filter((_, i) => isDone(i)).length + (hasQuiz && t.myPassed ? 1 : 0);
  const totalMinutes = t.lessons.reduce((sum, l) => sum + l.minutes, 0);

  const top = useRef<HTMLElement>(null);
  const go = (i: number) => {
    setCurrent(i);
    top.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };
  const next = () => {
    if (lesson) markWatched(lesson.id);
    if (current < steps - 1) go(current + 1);
  };

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
          {lesson ? (
            <>
              <LessonVideo key={lesson.id} video={lesson} title={lesson.title} className="course__video" />
              <section className="card course__lesson">
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
                    <Button variant="primary" onClick={() => (isDone(current) ? onBack() : markWatched(lesson.id))}>
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
              readOnly={readOnly}
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
          <div className="course__progress">
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
          {t.description && <p className="course__about va-pre">{t.description}</p>}
        </aside>
      </div>
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
  const [answers, setAnswers] = useState<Array<number | null>>(() => t.questions.map(() => null));
  const [result, setResult] = useState<AttemptOut | null>(null);
  const unanswered = answers.filter((a) => a === null).length;

  const send = () => submit.mutate({ id: t.id, answers }, { onSuccess: (r) => setResult(r) });
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
              {q.options.map((o, j) => (
                <label key={j} className="va-quiz__option">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[i] === j}
                    onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                  />
                  {o}
                </label>
              ))}
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
