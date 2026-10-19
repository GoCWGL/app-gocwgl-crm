"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Input, ProgressBar, Select, Textarea } from "@/components/ui";
import type { Survey, SurveyQuestion } from "@/data/admin";
import { cn } from "@/lib/utils";

type Answer = string | string[];

function isEmpty(q: SurveyQuestion, a: Answer | undefined): boolean {
  // First + last name: both boxes must be filled.
  if (q.type === "name" && !q.fullNameOnly) return !Array.isArray(a) || !a[0]?.trim() || !a[1]?.trim();
  return Array.isArray(a) ? a.length === 0 : !a?.trim();
}

/** Clickable preview of the survey as visitors will see it. */
export function SurveyPreview({ survey }: { survey: Survey }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
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
    const empty = list.filter((q) => q.req && isEmpty(q, answers[q.id])).map((q) => q.id);
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
        <PreviewQuestion
          key={q.id}
          number={questions.indexOf(q) + 1}
          question={q}
          answer={answers[q.id]}
          missing={missing.includes(q.id)}
          onAnswer={(a) => setAnswer(q.id, a)}
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

type PreviewQuestionProps = {
  number: number;
  question: SurveyQuestion;
  answer: Answer | undefined;
  missing: boolean;
  onAnswer: (a: Answer) => void;
};

function PreviewQuestion({ number, question: q, answer, missing, onAnswer }: PreviewQuestionProps) {
  const id = `sp-${q.id}`;
  const value = typeof answer === "string" ? answer : "";
  const picked = Array.isArray(answer) ? answer : [];
  const choices = q.options.filter((o) => o.trim());
  const withOther = q.other ? [...choices, "Other"] : choices;
  const label = (
    <>
      {number}. {q.title || "Untitled question"}
    </>
  );

  let control;
  switch (q.type) {
    case "long":
      control = <Textarea id={id} rows={3} value={value} onChange={(e) => onAnswer(e.target.value)} />;
      break;
    case "dropdown":
      control = <Select id={id} placeholder="Choose…" options={choices} value={value} onChange={(e) => onAnswer(e.target.value)} />;
      break;
    case "single":
      control = (
        <div className="survey-choices" role="radiogroup" aria-labelledby={`${id}-l`}>
          {withOther.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className="survey-choice" onClick={() => onAnswer(o)}>
              <span className="survey-choice__dot" aria-hidden="true" />
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "multi":
      control = (
        <div className="survey-choices">
          {withOther.map((o) => (
            <Checkbox
              key={o}
              label={o}
              checked={picked.includes(o)}
              onChange={() => onAnswer(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])}
            />
          ))}
        </div>
      );
      break;
    case "rating":
      control = (
        <div className="survey-stars" role="radiogroup" aria-labelledby={`${id}-l`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === String(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={cn("survey-stars__star", Number(value) >= n && "survey-stars__star--on")}
              onClick={() => onAnswer(String(n))}
            >
              ★
            </button>
          ))}
        </div>
      );
      break;
    case "scale":
      control = (
        <div className="stack stack--4">
          <div className="survey-scale" role="radiogroup" aria-labelledby={`${id}-l`}>
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === String(n)}
                className="survey-scale__item"
                onClick={() => onAnswer(String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="survey-scale__labels text-tiny">
            <span>{q.lowLabel}</span>
            <span>{q.highLabel}</span>
          </div>
        </div>
      );
      break;
    case "yesno":
      control = (
        <div className="survey-choices survey-choices--row" role="radiogroup" aria-labelledby={`${id}-l`}>
          {["Yes", "No"].map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className="survey-choice" onClick={() => onAnswer(o)}>
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "name":
      control = q.fullNameOnly ? (
        <Input id={id} autoComplete="name" placeholder="Full name" value={value} aria-invalid={missing} onChange={(e) => onAnswer(e.target.value)} />
      ) : (
        <div className="form-grid form-grid--narrow">
          {(["First name", "Last name"] as const).map((ph, k) => (
            <Input
              key={ph}
              id={k ? `${id}-last` : id}
              aria-label={ph}
              autoComplete={k ? "family-name" : "given-name"}
              placeholder={ph}
              value={picked[k] ?? ""}
              aria-invalid={missing && !picked[k]?.trim()}
              onChange={(e) => onAnswer(k ? [picked[0] ?? "", e.target.value] : [e.target.value, picked[1] ?? ""])}
            />
          ))}
        </div>
      );
      break;
    default:
      control = (
        <Input id={id} type={q.type === "short" ? "text" : q.type} value={value} aria-invalid={missing} onChange={(e) => onAnswer(e.target.value)} />
      );
  }

  const otherBox = q.other && (value === "Other" || picked.includes("Other")) && (
    <Input size="sm" aria-label="Other answer" placeholder="Tell us more" />
  );

  return (
    <div className={cn("survey-question", missing && "survey-question--missing")}>
      <Field
        label={<span id={`${id}-l`}>{label}</span>}
        htmlFor={["single", "multi", "rating", "scale", "yesno"].includes(q.type) ? undefined : id}
        required={q.req}
        strongLabel
        error={missing && (q.type === "name" && !q.fullNameOnly ? "Please add your first and last name" : "Please answer this question")}
      >
        {q.help && <span className="text-tiny">{q.help}</span>}
        {control}
        {otherBox}
      </Field>
    </div>
  );
}
