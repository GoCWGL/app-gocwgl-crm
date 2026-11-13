"use client";

import { useVaAccess } from "../lib/access";
import { useState } from "react";
import { Badge, Button, FormError, Icon, LessonPlayer, LoadState, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { youtubeThumb } from "@/lib/youtube";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AttemptOut, VaTrainingOut } from "@/utils/api/models";
import { useSubmitClientQuiz } from "@/utils/hooks/useClientWork";
import { useMyTrainings, useSubmitQuiz } from "@/utils/hooks/useTrainings";

type Audience = "va" | "client";

/** VA portal › Training: watch each lesson, then pass its quiz. */
export function TrainingSection() {
  const va = useVaAccess().ready;
  const query = useMyTrainings(va);
  return <TrainingList query={query} audience="va" />;
}

/** Training cards and the lesson + quiz drawer (VA portal and client portal). */
export function TrainingList({ query, audience, readOnly }: { query: UseQueryResult<VaTrainingOut[]>; audience: Audience; readOnly?: boolean }) {
  const trainings = query.data ?? [];
  const [openId, setOpenId] = useState("");
  const open = trainings.find((t) => t.id === openId) ?? null;

  const passed = trainings.filter((t) => t.myPassed).length;
  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading your trainings…" isEmpty={!trainings.length} empty={audience === "client" ? "No trainings yet. Guides from GoCWGL on working with your VA show up here." : "No trainings yet. New lessons from GoCWGL show up here."}>
        <div className="card stack stack--8">
          <div className="cluster cluster--between">
            <span className="text-strong">
              {passed} of {trainings.length} trainings passed
            </span>
            <span className="text-small">Watch the video, then take the quiz.</span>
          </div>
          <div className="training-card__bar">
            <span style={{ width: `${trainings.length ? (passed / trainings.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="training-grid training-grid--flush">
          {trainings.map((t) => (
            <button key={t.id} type="button" className="training-card" onClick={() => setOpenId(t.id)}>
              <span className="training-card__thumb">
                {t.lessons[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                  <img src={youtubeThumb(t.lessons[0].videoId)} alt="" loading="lazy" />
                ) : (
                  <Icon name="graduation" size={28} />
                )}
              </span>
              <span className="training-card__body">
                <span className="training-card__top">
                  <span className="training-card__title">{t.title}</span>
                  <StatusBadge t={t} />
                </span>
                <span className="training-card__meta">
                  <span>
                    <Icon name="video" size={12} /> {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
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
          ))}
        </div>
      </LoadState>
      {open && <TrainingModal training={open} audience={audience} readOnly={readOnly} onClose={() => setOpenId("")} />}
    </div>
  );
}

function StatusBadge({ t }: { t: VaTrainingOut }) {
  if (t.myPassed) return <Badge tone="green" dot>Passed</Badge>;
  if (t.myTries) return <Badge tone="amber" dot>Try again</Badge>;
  return <Badge tone="slate" dot>Not started</Badge>;
}

function TrainingModal({
  training: t,
  audience,
  readOnly,
  onClose,
}: {
  training: VaTrainingOut;
  audience: Audience;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const vaSubmit = useSubmitQuiz();
  const clientSubmit = useSubmitClientQuiz();
  const submit = audience === "client" ? clientSubmit : vaSubmit;
  const [answers, setAnswers] = useState<Array<number | null>>(() => t.questions.map(() => null));
  const [result, setResult] = useState<AttemptOut | null>(null);
  const [step, setStep] = useState<"watch" | "quiz">(t.myTries ? "quiz" : "watch");
  const unanswered = answers.filter((a) => a === null).length;

  const send = () =>
    submit.mutate({ id: t.id, answers }, { onSuccess: (r) => setResult(r) });
  const retry = () => {
    setAnswers(t.questions.map(() => null));
    setResult(null);
  };

  return (
    <Modal
      open
      variant="drawer"
      width={720}
      onClose={onClose}
      titleId="va-training"
      kicker="TRAINING"
      title={t.title}
      subtitle={t.questions.length ? `Quiz: ${t.questions.length} questions · pass at ${t.passingRate}%` : undefined}
      footer={
        <>
          <span className="u-spacer" />
          {step === "watch" && t.questions.length > 0 ? (
            <Button variant="primary" onClick={() => setStep("quiz")}>
              I’ve watched the lessons — take the quiz <Icon name="arrowRight" size={14} />
            </Button>
          ) : result ? (
            result.passed ? (
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button variant="primary" onClick={retry}>
                Try again
              </Button>
            )
          ) : t.questions.length > 0 ? (
            <Button variant="primary" disabled={readOnly || unanswered > 0 || submit.isPending} onClick={send}>
              {submit.isPending ? "Checking…" : unanswered ? `${unanswered} question${unanswered === 1 ? "" : "s"} left` : "Submit answers"}
            </Button>
          ) : (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          )}
        </>
      }
    >
      <div className="stack stack--16">
        {t.lessons.length > 0 && <LessonPlayer lessons={t.lessons} />}
        {t.description && <p className="va-pre">{t.description}</p>}

        {step === "quiz" && t.questions.length > 0 && (
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
                      : `${result.correct} of ${result.total} right. You need ${result.passingRate}% to pass — rewatch the video and try again.`}
                  </span>
                </span>
              </div>
            )}
            {t.questions.map((q, i) => {
              const verdict = result?.results[i];
              return (
                <fieldset
                  key={q.id}
                  className={cn("va-quiz__q", verdict === true && "is-right", verdict === false && "is-wrong")}
                  disabled={!!result}
                >
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
        )}
      </div>
    </Modal>
  );
}
