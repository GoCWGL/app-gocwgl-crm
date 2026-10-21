"use client";

import { useState, type FormEvent } from "react";
import { Button, ProgressBar } from "@/components/ui";
import type { Survey, SurveyQuestion } from "@/data/admin";
import { isUnanswered, SurveyQuestionField, type SurveyAnswer } from "@/features/public/SurveyQuestionField";

type Answer = SurveyAnswer;

/** Clickable preview of the survey as visitors will see it. */
export function SurveyPreview({ survey }: { survey: Survey }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [others, setOthers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const questions = survey.questions;
  const paged = survey.oneAtATime && questions.length > 0;
  const current = Math.min(step, Math.max(0, questions.length - 1));
  const visible = paged ? questions.slice(current, current + 1) : questions;
  const last = !paged || current === questions.length - 1;

  const setAnswer = (id: string, a: Answer) => {
    setAnswers((x) => ({ ...x, [id]: a }));
    setMissing((m) => m.filter((k) => k !== id));
  };

  const check = (list: SurveyQuestion[]) => {
    const empty = list.filter((q) => q.req && isUnanswered(q, answers[q.id], others[q.id])).map((q) => q.id);
    setMissing(empty);
    return empty.length === 0;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!check(visible)) return;
    if (!last) return setStep(current + 1);
    setDone(true);
  };

  const restart = () => {
    setAnswers({});
    setOthers({});
    setStep(0);
    setMissing([]);
    setDone(false);
  };

  if (done) {
    return (
      <div className="card form-preview survey-preview">
        <div className="notice notice--success u-strong" role="status">
          {survey.thanks || "Thanks for your answers!"}
        </div>
        <Button variant="soft" size="sm" onClick={restart}>
          Restart preview
        </Button>
      </div>
    );
  }

  return (
    <form className="card form-preview survey-preview" onSubmit={submit} noValidate>
      <h3 className="modal__title">{survey.name || "Untitled survey"}</h3>
      {survey.intro && (!paged || current === 0) && <p className="text-muted">{survey.intro}</p>}
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
          missing={missing.includes(q.id)}
          otherText={others[q.id]}
          onAnswer={(a) => setAnswer(q.id, a)}
          onOtherText={(text) => setOthers((o) => ({ ...o, [q.id]: text }))}
        />
      ))}
      {questions.length === 0 && <span className="text-small">Your questions will show here.</span>}

      <div className="cluster cluster--8">
        {paged && current > 0 && (
          <Button variant="secondary" onClick={() => setStep(current - 1)}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" className="u-grow">
          {last ? survey.button || "Submit" : "Next"}
        </Button>
      </div>
    </form>
  );
}
