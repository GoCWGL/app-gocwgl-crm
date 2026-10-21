"use client";

import { useState } from "react";
import { Button, ErrorState, Loading } from "@/components/ui";
import type { ContactOut } from "@/utils/api/models";
import { formatCall } from "@/utils/format/dates";
import { useContactSubmissions } from "@/utils/hooks/useForms";
import { formatAnswer, keyLabel } from "../lib/answers";

const SHOWN = 3;

/** On a contact's profile: custom fields (from forms' custom questions) and everything they submitted. */
export function ContactAnswersCard({ contact }: { contact: ContactOut }) {
  const submissions = useContactSubmissions(contact.id);
  const [all, setAll] = useState(false);
  const custom = Object.entries(contact.customFields ?? {});
  const list = submissions.data ?? [];
  const shown = all ? list : list.slice(0, SHOWN);

  if (!custom.length && submissions.isSuccess && !list.length) return null;

  return (
    <>
      {custom.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker">CUSTOM FIELDS</span>
          <dl className="inset submission__answers">
            {custom.map(([key, value]) => (
              <div className="submission__row" key={key}>
                <dt>{keyLabel(key)}</dt>
                <dd>{formatAnswer(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="stack stack--8">
        <span className="kicker">FORM SUBMISSIONS{list.length ? ` · ${list.length}` : ""}</span>
        {submissions.isPending && <Loading inline text="Loading submissions…" />}
        {submissions.isError && <ErrorState error={submissions.error} inline />}
        {shown.map((s) => (
          <article className="inset submission" key={s.id}>
            <div className="cluster cluster--between">
              <span className="text-strong">{s.formName}</span>
              <span className="text-small">{formatCall(s.createdAt)}</span>
            </div>
            <dl className="submission__answers">
              {s.answers.map((a, i) => (
                <div className="submission__row" key={`${a.fieldId}-${i}`}>
                  <dt>{a.label}</dt>
                  <dd>{formatAnswer(a.value)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
        {list.length > SHOWN && (
          <Button variant="link" size="sm" className="u-self-start" onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${list.length}`}
          </Button>
        )}
      </div>
    </>
  );
}
