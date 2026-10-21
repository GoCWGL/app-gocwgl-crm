"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button, ErrorState, Icon, Loading, ProgressBar } from "@/components/ui";
import type { SurveyQuestion } from "@/data/admin";
import * as api from "@/utils/api/surveys";
import { errorMessage, hasCode } from "@/utils/errors";
import { useApiMutation } from "@/utils/hooks/mutation";
import { answerErrors, useIsEmbedded } from "./embed";
import { PublicMessage, PublicShell } from "./PublicShell";
import { isUnanswered, SurveyQuestionField, type SurveyAnswer } from "./SurveyQuestionField";

/** What the API expects for each question type (see the backend's survey validation). */
function toApi(q: SurveyQuestion, a: SurveyAnswer | undefined, other: string): unknown {
  if (a === undefined || a === "" || (Array.isArray(a) && !a.length)) return null;
  const withOther = (v: string) => (v === "Other" && q.other ? other.trim() : v);
  switch (q.type) {
    case "name":
      return Array.isArray(a) ? { first: a[0]?.trim() ?? "", last: a[1]?.trim() ?? "" } : a.trim();
    case "multi":
      return (a as string[]).map(withOther).filter(Boolean);
    case "single":
    case "dropdown":
      return withOther(a as string);
    case "yesno":
      return (a as string).toLowerCase();
    case "rating":
    case "scale":
      return Number(a);
    default:
      return typeof a === "string" ? a.trim() : a;
  }
}

/** Hosted survey at /survey/{id}; with ?embed=1 it fits inside an iframe on any website. */
export function PublicSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const embedded = useIsEmbedded();
  const survey = useQuery({ queryKey: ["public-survey", id], queryFn: () => api.getPublicSurvey(id), retry: false });
  const started = useRef(false);
  const honeypot = useRef("");
  const submit = useApiMutation((answers: Record<string, unknown>) => api.submitPublicSurvey(id, { answers, website: honeypot.current }));
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [others, setOthers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  let body;
  if (survey.isPending) body = <Loading text="Loading survey…" />;
  else if (survey.isError)
    body = hasCode(survey.error, "not_found") ? (
      <PublicMessage title="This survey isn’t available">
        <p className="text-muted">It may be closed or still a draft.</p>
      </PublicMessage>
    ) : (
      <ErrorState error={survey.error} onRetry={survey.refetch} />
    );
  else if (submit.isSuccess)
    body = (
      <PublicMessage
        title={survey.data.thanks || "Thanks for your answers!"}
        icon={
          <span className="public-page__check" aria-hidden="true">
            <Icon name="check" size={26} strokeWidth={2.6} />
          </span>
        }
      />
    );
  else {
    const s = survey.data;
    const questions = s.questions as SurveyQuestion[];
    const paged = s.oneAtATime && questions.length > 0;
    const current = Math.min(step, Math.max(0, questions.length - 1));
    const visible = paged ? questions.slice(current, current + 1) : questions;
    const last = !paged || current === questions.length - 1;
    const serverErrors = answerErrors(submit.error);

    // Counts a start once, for the completion rate.
    const touch = () => {
      if (started.current) return;
      started.current = true;
      void api.startPublicSurvey(id).catch(() => undefined);
    };
    const onSubmit = (e: FormEvent) => {
      e.preventDefault();
      touch();
      const empty = visible.filter((q) => q.req && isUnanswered(q, answers[q.id], others[q.id])).map((q) => q.id);
      setMissing(empty);
      if (empty.length) return;
      if (!last) return setStep(current + 1);
      submit.mutate(Object.fromEntries(questions.map((q) => [q.id, toApi(q, answers[q.id], others[q.id] ?? "")])), {
        // Jump back to the first question the API rejected.
        onError: (err) => {
          const bad = questions.findIndex((q) => answerErrors(err)[q.id]);
          if (paged && bad >= 0) setStep(bad);
        },
      });
    };

    body = (
      <form className="public-page__card survey-preview" onSubmit={onSubmit} onFocus={touch} noValidate>
        <h1 className="public-page__title">{s.name}</h1>
        {s.intro && (!paged || current === 0) && <p className="text-muted">{s.intro}</p>}
        {paged && (
          <div className="stack stack--4">
            <ProgressBar value={(current / questions.length) * 100} label="Survey progress" />
            <span className="text-tiny">
              Question {current + 1} of {questions.length}
            </span>
          </div>
        )}
        {visible.map((q) => (
          <SurveyQuestionField
            key={q.id}
            number={questions.indexOf(q) + 1}
            question={q}
            answer={answers[q.id]}
            otherText={others[q.id]}
            error={serverErrors[q.id]}
            missing={missing.includes(q.id) || !!serverErrors[q.id]}
            onAnswer={(a) => {
              setAnswers((x) => ({ ...x, [q.id]: a }));
              setMissing((m) => m.filter((k) => k !== q.id));
            }}
            onOtherText={(text) => setOthers((o) => ({ ...o, [q.id]: text }))}
          />
        ))}
        {/* Honeypot: hidden from people; bots fill it in and the API drops the response. */}
        <input
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="website"
          onChange={(e) => (honeypot.current = e.target.value)}
        />
        {submit.isError && !Object.keys(serverErrors).length && (
          <p className="text-error" role="alert">
            {errorMessage(submit.error)}
          </p>
        )}
        <div className="cluster cluster--8">
          {paged && current > 0 && (
            <Button variant="secondary" onClick={() => setStep(current - 1)}>
              Back
            </Button>
          )}
          <Button type="submit" variant="primary" size="lg" className="u-grow" disabled={submit.isPending}>
            {submit.isPending ? "Sending…" : last ? s.button || "Submit" : "Next"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <PublicShell embedded={embedded} narrow>
      {body}
    </PublicShell>
  );
}
