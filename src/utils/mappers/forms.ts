import type { FormField, LeadForm } from "@/data/admin";
import type { FormIn, FormOut } from "@/utils/api/models";

/** Short random id for a new field (the API allows up to 40 characters). */
export const newFieldId = () => `f${Math.random().toString(36).slice(2, 10)}`;

/** API form → the builder's draft. */
export function formToDraft(f: FormOut): LeadForm {
  return {
    id: f.id,
    name: f.name,
    on: f.isActive,
    subs: f.submissions,
    button: f.button,
    success: f.successMessage,
    stage: (["lead", "booked", "paid", "lost"].includes(f.stage) ? f.stage : "lead") as LeadForm["stage"],
    tag: f.tagId ?? "",
    thanksMode: f.thanksMode === "redirect" ? "redirect" : "message",
    redirectUrl: f.redirectUrl,
    fields: (f.fields as FormField[]).map((x) => ({ ...x, id: String(x.id), ph: x.ph ?? "", opts: x.opts ?? "", req: !!x.req })),
  };
}

/** The builder's draft → POST/PATCH body (only documented fields). */
export function draftToForm(d: LeadForm): FormIn {
  return {
    name: d.name.trim(),
    isActive: d.on,
    button: d.button,
    successMessage: d.success,
    stage: d.stage,
    tagId: d.tag || null,
    thanksMode: d.thanksMode === "redirect" ? "redirect" : "message",
    redirectUrl: d.thanksMode === "redirect" ? (d.redirectUrl ?? "") : "",
    fields: d.fields.map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      ph: f.ph,
      req: f.req,
      opts: f.opts,
      custom: !!f.custom,
      ...(f.custom && f.key ? { key: f.key } : {}),
    })),
  };
}
