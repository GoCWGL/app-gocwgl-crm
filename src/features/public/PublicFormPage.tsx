"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button, Checkbox, ErrorState, Field, Icon, Input, Loading, Select, Textarea } from "@/components/ui";
import { FIELD_TYPES, type FormField } from "@/data/admin";
import * as api from "@/utils/api/forms";
import { errorMessage, hasCode } from "@/utils/errors";
import { useApiMutation } from "@/utils/hooks/mutation";
import { answerErrors, redirectTo, useIsEmbedded } from "./embed";
import { PublicMessage, PublicShell } from "./PublicShell";

type Value = string | boolean;

/** Hosted lead form at /form/{id}; with ?embed=1 it fits inside an iframe on any website. */
export function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const embedded = useIsEmbedded();
  const form = useQuery({ queryKey: ["public-form", id], queryFn: () => api.getPublicForm(id), retry: false });
  const honeypot = useRef("");
  const submit = useApiMutation((answers: Record<string, Value>) => api.submitPublicForm(id, { answers, website: honeypot.current }), {
    onSuccess: (result) => {
      if (result.thanksMode === "redirect" && result.redirectUrl) redirectTo(result.redirectUrl, embedded);
    },
  });
  const [values, setValues] = useState<Record<string, Value>>({});
  const [missing, setMissing] = useState<string[]>([]);

  let body;
  if (form.isPending) body = <Loading text="Loading form…" />;
  else if (form.isError)
    body = hasCode(form.error, "not_found") ? (
      <PublicMessage title="This form isn’t available">
        <p className="text-muted">It may have been turned off.</p>
      </PublicMessage>
    ) : (
      <ErrorState error={form.error} onRetry={form.refetch} />
    );
  else if (submit.isSuccess)
    body =
      submit.data.thanksMode === "redirect" && submit.data.redirectUrl ? (
        <Loading text="One moment…" />
      ) : (
        <PublicMessage
          title={submit.data.message || "Thanks! We’ll be in touch soon."}
          icon={
            <span className="public-page__check" aria-hidden="true">
              <Icon name="check" size={26} strokeWidth={2.6} />
            </span>
          }
        />
      );
  else {
    const fields = (form.data.fields as FormField[]).map((f) => ({ ...f, id: String(f.id), ph: f.ph ?? "", opts: f.opts ?? "" }));
    const serverErrors = answerErrors(submit.error);
    const set = (fid: string, v: Value) => {
      setValues((x) => ({ ...x, [fid]: v }));
      setMissing((m) => m.filter((k) => k !== fid));
    };
    const onSubmit = (e: FormEvent) => {
      e.preventDefault();
      const empty = fields.filter((f) => f.req && !(typeof values[f.id] === "string" ? (values[f.id] as string).trim() : values[f.id])).map((f) => f.id);
      setMissing(empty);
      if (empty.length) return;
      submit.mutate(Object.fromEntries(fields.map((f) => [f.id, typeof values[f.id] === "string" ? (values[f.id] as string).trim() : (values[f.id] ?? "")])));
    };

    body = (
      <form className="public-page__card" onSubmit={onSubmit} noValidate>
        <h1 className="public-page__title">{form.data.name}</h1>
        {fields.map((f) => {
          const error = serverErrors[f.id] || (missing.includes(f.id) ? `${f.label} is required.` : "");
          const fid = `pf-${f.id}`;
          if (f.type === "checkbox") {
            return (
              <div className="stack stack--4" key={f.id}>
                <Checkbox label={f.label} checked={!!values[f.id]} onChange={(e) => set(f.id, e.target.checked)} />
                {error && <span className="field__error">{error}</span>}
              </div>
            );
          }
          const value = typeof values[f.id] === "string" ? (values[f.id] as string) : "";
          return (
            <Field key={f.id} label={f.label} htmlFor={fid} required={f.req} strongLabel error={error}>
              {f.type === "textarea" ? (
                <Textarea id={fid} rows={4} placeholder={f.ph} value={value} aria-invalid={!!error} onChange={(e) => set(f.id, e.target.value)} />
              ) : f.type === "select" ? (
                <Select
                  id={fid}
                  placeholder="Choose…"
                  options={f.opts
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)}
                  value={value}
                  aria-invalid={!!error}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              ) : (
                <Input
                  id={fid}
                  type={FIELD_TYPES[f.type]?.html || "text"}
                  autoComplete={f.type === "email" ? "email" : f.type === "phone" ? "tel" : undefined}
                  placeholder={f.ph}
                  value={value}
                  aria-invalid={!!error}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )}
            </Field>
          );
        })}
        {/* Honeypot: hidden from people; bots fill it in and the API drops the submission. */}
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
        <Button type="submit" variant="primary" size="lg" disabled={submit.isPending}>
          {submit.isPending ? "Sending…" : form.data.button || "Submit"}
        </Button>
      </form>
    );
  }

  return (
    <PublicShell embedded={embedded} narrow>
      {body}
    </PublicShell>
  );
}
