"use client";

import { useState } from "react";
import { Badge, Button, Icon, IconButton, IconTile, StatGrid } from "@/components/ui";
import { QUESTION_TYPES, type Survey } from "@/data/admin";
import { cn, newId } from "@/lib/utils";
import { blankSurvey } from "../../lib/surveys";
import { useAdmin } from "../../state/AdminContext";
import { SurveyBuilder } from "./SurveyBuilder";
import { SurveyEmbedModal } from "./SurveyEmbedModal";

export function SurveysSection() {
  const { state, update } = useAdmin();
  const { surveys } = state;
  const [draft, setDraft] = useState<Survey | null>(null);
  const [embedId, setEmbedId] = useState(0);
  const [confirmId, setConfirmId] = useState(0);
  const embedSurvey = surveys.find((s) => s.id === embedId);

  if (draft) return <SurveyBuilder draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />;

  const setSurveys = (fn: (list: Survey[]) => Survey[]) => update((s) => ({ surveys: fn(s.surveys) }));
  const live = surveys.filter((s) => s.on);
  const answered = surveys.filter((s) => s.responses);
  const avgCompletion = answered.length ? Math.round(answered.reduce((n, s) => n + s.completion, 0) / answered.length) : 0;

  return (
    <div className="page-stack">
      <StatGrid
        plain
        items={[
          { label: "Surveys", value: surveys.length },
          { label: "Live surveys", value: live.length },
          { label: "Total responses", value: surveys.reduce((n, s) => n + s.responses, 0) },
          { label: "Avg. completion", value: `${avgCompletion}%` },
        ]}
      />

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Your surveys</h2>
          <span className="text-muted">Create as many as you need, write your own questions, and embed them anywhere</span>
        </div>
        <Button variant="primary" size="lg" onClick={() => setDraft(blankSurvey())}>
          <Icon name="plus" strokeWidth={2.4} />
          Create survey
        </Button>
      </div>

      {surveys.length === 0 ? (
        <div className="empty-state">No surveys yet. Create your first one to start collecting answers.</div>
      ) : (
        <div className="tile-grid tile-grid--wide">
          {surveys.map((s) => (
            <article key={s.id} className={cn("card form-card", !s.on && "form-card--off")}>
              <div className="cluster cluster--nowrap form-card__head">
                <IconTile tone="purple" size="lg">
                  <Icon name="survey" size={18} strokeWidth={1.8} />
                </IconTile>
                <div className="stack stack--2 u-grow">
                  <h3 className="card-title u-strong">{s.name}</h3>
                  <span className="text-small">
                    {s.questions.length} question{s.questions.length === 1 ? "" : "s"} · {s.responses} responses
                    {s.responses > 0 && ` · ${s.completion}% finish`}
                    {` · ${s.oneAtATime ? "1 question per page" : "1 page"}`}
                  </span>
                </div>
                <Badge tone={s.on ? "green" : "neutral"} mono>
                  {s.on ? "LIVE" : "DRAFT"}
                </Badge>
              </div>
              <ol className="inset inset--soft survey-card__questions">
                {s.questions.map((q) => (
                  <li key={q.id} className="survey-card__question">
                    <Icon name={QUESTION_TYPES[q.type].icon} size={13} />
                    <span className="u-grow">
                      {q.title || "Untitled question"}
                      {q.req ? " *" : ""}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="cluster cluster--8">
                <Button size="sm" onClick={() => setDraft(structuredClone(s))}>
                  <Icon name="edit" size={13} />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEmbedId(s.id)}>
                  <Icon name="code" size={13} />
                  Get embed code
                </Button>
                <Button size="sm" onClick={() => setSurveys((list) => list.map((x) => (x.id === s.id ? { ...x, on: !x.on } : x)))}>
                  {s.on ? "Unpublish" : "Publish"}
                </Button>
                <span className="u-spacer" />
                <IconButton
                  label={`Duplicate ${s.name}`}
                  size="lg"
                  onClick={() =>
                    setSurveys((list) => [
                      ...list,
                      { ...structuredClone(s), id: newId(), name: `${s.name} (copy)`, responses: 0, completion: 0, on: false },
                    ])
                  }
                >
                  <Icon name="copy" size={14} />
                </IconButton>
                {confirmId === s.id ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setSurveys((list) => list.filter((x) => x.id !== s.id));
                      setConfirmId(0);
                    }}
                  >
                    Delete for good
                  </Button>
                ) : (
                  <IconButton label={`Delete ${s.name}`} size="lg" danger onClick={() => setConfirmId(s.id)}>
                    <Icon name="trash" size={14} />
                  </IconButton>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {embedSurvey && <SurveyEmbedModal survey={embedSurvey} onClose={() => setEmbedId(0)} />}
    </div>
  );
}
