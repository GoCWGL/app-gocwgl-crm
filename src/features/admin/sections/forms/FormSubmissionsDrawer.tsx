"use client";

import { Button, Icon, IconTile, LoadState, Modal, buttonClass } from "@/components/ui";
import type { LeadForm } from "@/data/admin";
import { toCsvDataUrl } from "@/lib/utils";
import type { SubmissionOut } from "@/utils/api/models";
import { formatCall } from "@/utils/format/dates";
import { useFormSubmissions } from "@/utils/hooks/useForms";
import { useAdmin } from "../../state/AdminContext";
import { formatAnswer } from "../../lib/answers";

const LIMIT = 100;

/** Who sent a submission: the form's name and email answers. */
function sender(form: LeadForm, s: SubmissionOut): string {
  const pick = (type: string, labelHas?: string) =>
    form.fields.find((f) => f.type === type && (!labelHas || f.label.toLowerCase().includes(labelHas)));
  const name = pick("text", "name");
  const email = pick("email");
  return [name && s.data[name.id], email && s.data[email.id]].filter(Boolean).map(String).join(" · ") || "Unknown visitor";
}

/** A form's submissions, newest first, with every answer under its field's label. */
export function FormSubmissionsDrawer({ form, onClose }: { form: LeadForm; onClose: () => void }) {
  const { update } = useAdmin();
  const query = useFormSubmissions(form.id);
  const rows = query.data ?? [];
  // Answers to fields that were removed from the form since.
  const known = new Set(form.fields.map((f) => f.id));
  const csv = toCsvDataUrl([
    ["Submitted", ...form.fields.map((f) => f.label)],
    ...rows.map((s) => [s.createdAt, ...form.fields.map((f) => (s.data[f.id] === undefined ? "" : formatAnswer(s.data[f.id])))]),
  ]);

  return (
    <Modal
      open
      variant="drawer"
      width={620}
      onClose={onClose}
      titleId="fs-title"
      kicker="SUBMISSIONS"
      title={form.name}
      subtitle={`${form.subs} in total${form.subs > LIMIT ? ` · showing the latest ${LIMIT}` : ""}`}
      media={
        <IconTile tone="indigo" size="lg">
          <Icon name="form" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow" />
          {rows.length > 0 && (
            <a className={buttonClass({ variant: "outline" })} href={csv} download={`${form.name || "form"}-submissions.csv`}>
              <Icon name="download" size={14} />
              Export CSV
            </a>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <LoadState query={query} isEmpty={!rows.length} empty="No submissions yet. Share the form’s link or embed it on a page.">
        <div className="stack stack--10">
          {rows.map((s) => (
            <article className="inset submission" key={s.id}>
              <div className="cluster cluster--between">
                <span className="text-strong">{sender(form, s)}</span>
                <span className="text-small">{formatCall(s.createdAt)}</span>
              </div>
              <dl className="submission__answers">
                {form.fields
                  .filter((f) => s.data[f.id] !== undefined)
                  .map((f) => (
                    <div className="submission__row" key={f.id}>
                      <dt>{f.label}</dt>
                      <dd>{formatAnswer(s.data[f.id])}</dd>
                    </div>
                  ))}
                {Object.keys(s.data)
                  .filter((id) => !known.has(id))
                  .map((id) => (
                    <div className="submission__row" key={id}>
                      <dt>Removed field</dt>
                      <dd>{formatAnswer(s.data[id])}</dd>
                    </div>
                  ))}
              </dl>
              {s.contactId && (
                <Button
                  variant="link"
                  size="sm"
                  className="u-self-start"
                  onClick={() => {
                    onClose();
                    update({ editContactId: s.contactId! });
                  }}
                >
                  Open contact
                </Button>
              )}
            </article>
          ))}
        </div>
      </LoadState>
    </Modal>
  );
}
