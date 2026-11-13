"use client";

import { useId, useState, type ReactNode } from "react";
import { Button, Checkbox, Field, FormError, Icon, IconButton, Input, Select, Textarea } from "@/components/ui";
import type { ResumeCert, ResumeJob, ResumeSchool } from "@/utils/api/models";
import { openResumeDocument } from "@/utils/api/vaPortal";
import { useUploadResumeDocument } from "@/utils/hooks/useVaPortal";
import { COUNTRIES } from "@/data/countries";
import { LIMITS, uploadProblem } from "../lib/resumeErrors";
import { MONTHS, formatMonthYear, jobDates, parseMonthYear, schoolDates, schoolTitle } from "../lib/resumeFormat";
import { OrgSearchInput } from "./OrgSearchInput";

/** The error under one part of an entry (`title`, `bullets`…). */
type ErrorOf = (key: string) => string | undefined;
const invalid = (e?: string) => (e ? true : undefined);

const THIS_YEAR = new Date().getFullYear();
const years = (ahead: number) => Array.from({ length: THIS_YEAR + ahead - 1959 }, (_, i) => String(THIS_YEAR + ahead - i));

// ---------------------------------------------------------------- Dates
/** Month and year pickers that store "Jan 2022" (or just "2022"). Older free-text dates stay until replaced. */
export function MonthYearField({
  label,
  value,
  onChange,
  error,
  disabled,
  ahead = 0,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  /** Years into the future to offer (an expected graduation). */
  ahead?: number;
  required?: boolean;
}) {
  const id = useId();
  const p = parseMonthYear(value);
  return (
    <Field label={label} htmlFor={`${id}-m`} error={error} required={required} hint={p.other ? `Was “${p.other}”. Pick a month and year to replace it.` : undefined}>
      <div className="resume-date">
        <Select
          id={`${id}-m`}
          aria-label={`${label}: month`}
          aria-invalid={invalid(error)}
          disabled={disabled}
          value={p.month ? String(p.month) : ""}
          placeholder="Month"
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          onChange={(e) => onChange(formatMonthYear(Number(e.target.value) || undefined, p.year))}
        />
        <Select
          aria-label={`${label}: year`}
          aria-invalid={invalid(error)}
          disabled={disabled}
          value={p.year ? String(p.year) : ""}
          placeholder="Year"
          options={years(ahead)}
          onChange={(e) => onChange(formatMonthYear(p.month, Number(e.target.value) || undefined))}
        />
      </div>
    </Field>
  );
}

function YearField({ label, value, onChange, error, ahead = 0, emptyLabel = "Year" }: { label: string; value: string; onChange: (v: string) => void; error?: string; ahead?: number; emptyLabel?: string }) {
  const id = useId();
  const options = years(ahead);
  // Keep an older value that isn't a plain year visible.
  if (value && !options.includes(value)) options.unshift(value);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Select id={id} aria-invalid={invalid(error)} value={value} placeholder={emptyLabel} options={options} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

// ---------------------------------------------------------------- Shared card frame
function EntryCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`resume-entry${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function AddEntryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="resume-entry-add" onClick={onClick}>
      <Icon name="plus" size={14} /> {children}
    </button>
  );
}

// ---------------------------------------------------------------- Work experience
export const emptyJob = (): ResumeJob => ({ title: "", company: "", location: "", start: "", end: "", current: false, bullets: [] });

/** One role: a summary card, or the form while it's being edited (with its own Save). */
export function JobCard({
  job,
  editing,
  error,
  hasError,
  saving,
  onEdit,
  onChange,
  onSave,
  onRemove,
  onUp,
}: {
  job: ResumeJob;
  editing: boolean;
  error: ErrorOf;
  hasError: boolean;
  saving: boolean;
  onEdit: () => void;
  /** Only what changed: applied to the latest state, so quick successive edits don't undo each other. */
  onChange: (p: Partial<ResumeJob>) => void;
  onSave: () => void;
  onRemove: () => void;
  onUp?: () => void;
}) {
  const id = useId();
  const patch = onChange;

  if (!editing) {
    const bullets = (job.bullets ?? []).filter((b) => b.trim());
    return (
      <EntryCard className={hasError ? "is-invalid" : undefined}>
        <div className="resume-entry__summary">
          <span className="resume-entry__icon" aria-hidden="true">
            <Icon name="briefcase" size={15} />
          </span>
          <span className="resume-entry__text">
            <strong>{job.title || "Untitled role"}</strong>
            {(job.company || job.location) && <span>{[job.company, job.location].filter(Boolean).join(" · ")}</span>}
            {jobDates(job) && <em>{jobDates(job)}</em>}
            {bullets.length > 0 && <small>{bullets.length} achievement{bullets.length === 1 ? "" : "s"}</small>}
            {hasError && (
              <span className="field__error" role="alert">
                Something here needs fixing. Edit to see it.
              </span>
            )}
          </span>
          <span className="resume-entry__tools">
            {onUp && (
              <IconButton label="Move up" size="sm" onClick={onUp}>
                <Icon name="chevronUp" size={13} />
              </IconButton>
            )}
            <IconButton label="Edit role" size="sm" onClick={onEdit}>
              <Icon name="edit" size={13} />
            </IconButton>
            <IconButton label="Remove role" size="sm" onClick={onRemove}>
              <Icon name="trash" size={13} />
            </IconButton>
          </span>
        </div>
      </EntryCard>
    );
  }

  return (
    <EntryCard className="is-editing">
      <div className="form-grid">
        <Field label="Job title" htmlFor={`${id}-title`} error={error("title")}>
          <Input id={`${id}-title`} aria-invalid={invalid(error("title"))} maxLength={LIMITS.job} placeholder="Executive Virtual Assistant" value={job.title ?? ""} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Company" htmlFor={`${id}-company`} error={error("company")} hint="Start typing to search, or enter any name.">
          <OrgSearchInput id={`${id}-company`} kind="company" invalid={!!error("company")} maxLength={LIMITS.job} placeholder="Search a company" value={job.company ?? ""} onChange={(v) => patch({ company: v })} />
        </Field>
        <Field label="Location" htmlFor={`${id}-loc`} error={error("location")} className="form-grid__full">
          <Input id={`${id}-loc`} aria-invalid={invalid(error("location"))} maxLength={LIMITS.job} placeholder="Remote, or Makati, Philippines" value={job.location ?? ""} onChange={(e) => patch({ location: e.target.value })} />
        </Field>
        <MonthYearField label="Start date" value={job.start ?? ""} error={error("start")} onChange={(v) => patch({ start: v })} />
        <MonthYearField label="End date" value={job.current ? "" : (job.end ?? "")} disabled={!!job.current} error={error("end")} onChange={(v) => patch({ end: v })} />
        <Checkbox className="form-grid__full" label="I currently work here" checked={!!job.current} onChange={(e) => patch({ current: e.target.checked, end: e.target.checked ? "" : job.end })} />
        <Field
          label="Key achievements"
          htmlFor={`${id}-bullets`}
          className="form-grid__full"
          error={error("bullets")}
          hint={`One per line. Start with a verb and add a result: “Cut response time from 24h to 2h.” Up to ${LIMITS.bullets} lines.`}
        >
          <Textarea
            id={`${id}-bullets`}
            aria-invalid={invalid(error("bullets"))}
            rows={4}
            placeholder={"Built GoHighLevel pipelines for 12 clients\nAutomated lead follow-up, lifting bookings 30%"}
            value={(job.bullets ?? []).join("\n")}
            onChange={(e) => patch({ bullets: e.target.value.split("\n").slice(0, LIMITS.bullets) })}
          />
        </Field>
      </div>
      <div className="resume-entry__foot">
        <Button variant="link" size="sm" onClick={onRemove}>
          <Icon name="trash" size={12} /> Remove
        </Button>
        <span className="u-spacer" />
        <Button variant="primary" size="sm" disabled={saving} onClick={onSave}>
          <Icon name="check" size={12} /> {saving ? "Saving…" : "Save experience"}
        </Button>
      </div>
    </EntryCard>
  );
}

// ---------------------------------------------------------------- Education
export const DEGREES = [
  "Bachelor's degree",
  "Associate degree",
  "Master's degree",
  "Doctorate (PhD)",
  "Vocational / TESDA certificate",
  "Certificate course",
  "Senior high school",
  "High school diploma",
  "Other",
];
/** A new school starts in the VA's own country (from their location), so the school search looks there first. */
/** Degrees earned at a high school: the school search then looks for high schools in the country. */
const HIGH_SCHOOL_DEGREES = new Set(["High school diploma", "Senior high school"]);

export const emptySchool = (country = ""): ResumeSchool => ({ school: "", degree: DEGREES[0], field: "", start: "", end: "", year: "", country });

export function SchoolCard({ school, error, onChange, onRemove }: { school: ResumeSchool; error: ErrorOf; onChange: (p: Partial<ResumeSchool>) => void; onRemove: () => void }) {
  const id = useId();
  const patch = onChange;
  const degrees = school.degree && !DEGREES.includes(school.degree) ? [school.degree, ...DEGREES] : DEGREES;
  const title = schoolTitle(school);
  const highSchool = HIGH_SCHOOL_DEGREES.has(school.degree ?? "");
  const where = school.country ? ` in ${school.country}` : "";
  return (
    <EntryCard className="is-editing">
      <div className="resume-entry__head">
        <span className="resume-entry__icon" aria-hidden="true">
          <Icon name="graduation" size={15} />
        </span>
        <span className="resume-entry__text">
          <strong>{school.school || "New school"}</strong>
          {(title !== school.school || schoolDates(school) || school.country) && (
            <span>{[title !== school.school ? title : "", school.country, schoolDates(school)].filter(Boolean).join(" · ")}</span>
          )}
        </span>
        <IconButton label="Remove school" size="sm" onClick={onRemove}>
          <Icon name="trash" size={13} />
        </IconButton>
      </div>
      <div className="form-grid">
        <Field label="Country" htmlFor={`${id}-country`} error={error("country")} hint="Schools here show first in the search.">
          <Select
            id={`${id}-country`}
            aria-invalid={invalid(error("country"))}
            value={school.country ?? ""}
            placeholder="Any country"
            options={school.country && !COUNTRIES.includes(school.country) ? [school.country, ...COUNTRIES] : COUNTRIES}
            onChange={(e) => patch({ country: e.target.value })}
          />
        </Field>
        <Field label="Degree" htmlFor={`${id}-degree`} error={error("degree")} hint="Pick “High school diploma” to search high schools.">
          <Select id={`${id}-degree`} aria-invalid={invalid(error("degree"))} value={school.degree || DEGREES[0]} options={degrees} onChange={(e) => patch({ degree: e.target.value })} />
        </Field>
        <Field
          className="form-grid__full"
          label={highSchool ? "High school" : "School or university"}
          htmlFor={`${id}-school`}
          error={error("school")}
          hint={highSchool ? `Searching high schools${where}. Not listed? Type the full name.` : "Start typing to search, or enter any name."}
        >
          <OrgSearchInput
            id={`${id}-school`}
            kind={highSchool ? "highschool" : "school"}
            country={school.country ?? ""}
            invalid={!!error("school")}
            maxLength={LIMITS.school}
            placeholder={highSchool ? `Search high schools${where}` : school.country ? `Search schools${where}` : "Search a school"}
            value={school.school ?? ""}
            onChange={(v) => patch({ school: v })}
          />
        </Field>
        <Field label={highSchool ? "Strand or track" : "Course or field of study"} htmlFor={`${id}-field`} error={error("field")} hint={highSchool ? "Optional" : undefined}>
          <Input
            id={`${id}-field`}
            aria-invalid={invalid(error("field"))}
            maxLength={LIMITS.school}
            placeholder={highSchool ? "STEM, ABM, HUMSS…" : "Business Administration"}
            value={school.field ?? ""}
            onChange={(e) => patch({ field: e.target.value })}
          />
        </Field>
        <YearField label="Start year" value={school.start ?? ""} error={error("start")} onChange={(v) => patch({ start: v })} />
        <YearField label="End year (or expected)" value={school.end || (!school.start ? (school.year ?? "") : "")} ahead={6} error={error("end")} onChange={(v) => patch({ end: v, year: "" })} />
      </div>
    </EntryCard>
  );
}

// ---------------------------------------------------------------- Certifications & tests
const CERT_KINDS: Array<{ value: NonNullable<ResumeCert["kind"]>; label: string; placeholder: string; issuer: string }> = [
  { value: "certification", label: "Certification", placeholder: "HubSpot CRM Certification", issuer: "HubSpot Academy" },
  { value: "personality", label: "Personality test", placeholder: "DISC assessment", issuer: "Tony Robbins DISC" },
  { value: "skills", label: "Skills test", placeholder: "English proficiency test", issuer: "EF SET" },
  { value: "other", label: "Course or award", placeholder: "Google Workspace course", issuer: "Coursera" },
];
export const emptyCert = (): ResumeCert => ({ kind: "certification", name: "", issuer: "", year: "", result: "", url: "", credentialId: "" });

/** One certification or test: type, name, issuer, date, score, credential ID, a link and an uploaded result. Only the name is needed. */
export function CertCard({ cert, error, onChange, onRemove }: { cert: ResumeCert; error: ErrorOf; onChange: (p: Partial<ResumeCert>) => void; onRemove: () => void }) {
  const upload = useUploadResumeDocument();
  const [opening, setOpening] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const kind = CERT_KINDS.find((k) => k.value === (cert.kind ?? "certification")) ?? CERT_KINDS[0];
  const id = useId();
  const patch = onChange;
  const isTest = kind.value === "personality" || kind.value === "skills";

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = uploadProblem(file, "document");
    setFileError(problem);
    if (problem) return;
    upload.reset();
    upload.mutate(file, { onSuccess: (doc) => patch({ documentId: doc.id, documentName: doc.name, documentType: doc.contentType }) });
  };
  const view = async () => {
    if (!cert.documentId) return;
    setOpening(true);
    try {
      await openResumeDocument(cert.documentId);
    } finally {
      setOpening(false);
    }
  };

  return (
    <EntryCard className="is-editing">
      <div className="resume-entry__head">
        <span className="resume-entry__icon" aria-hidden="true">
          <Icon name="circleCheck" size={15} />
        </span>
        <span className="resume-entry__text">
          <strong>{cert.name || `New ${kind.label.toLowerCase()}`}</strong>
          {(cert.issuer || cert.year) && <span>{[cert.issuer, cert.year].filter(Boolean).join(" · ")}</span>}
        </span>
        <IconButton label="Remove" size="sm" onClick={onRemove}>
          <Icon name="trash" size={13} />
        </IconButton>
      </div>
      <div className="form-grid">
        <Field label="Type" htmlFor={`${id}-kind`}>
          <Select id={`${id}-kind`} value={kind.value} options={CERT_KINDS.map((k) => ({ value: k.value, label: k.label }))} onChange={(e) => patch({ kind: e.target.value as ResumeCert["kind"] })} />
        </Field>
        <Field label={isTest ? "Test name" : "Name"} htmlFor={`${id}-name`} required error={error("name")}>
          <Input id={`${id}-name`} aria-invalid={invalid(error("name"))} maxLength={LIMITS.cert} placeholder={kind.placeholder} value={cert.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label={isTest ? "Provider" : "Issuing organization"} htmlFor={`${id}-issuer`} error={error("issuer")}>
          <OrgSearchInput id={`${id}-issuer`} kind="company" invalid={!!error("issuer")} maxLength={LIMITS.cert} placeholder={kind.issuer} value={cert.issuer ?? ""} onChange={(v) => patch({ issuer: v })} />
        </Field>
        <MonthYearField label={isTest ? "Date taken" : "Issue date"} value={cert.year ?? ""} error={error("year")} onChange={(v) => patch({ year: v })} />
        <Field label={isTest ? "Result or score" : "Grade or score"} htmlFor={`${id}-result`} error={error("result")} hint={isTest ? "e.g. ENFJ, High D / I, C1, 75 WPM" : "Optional"}>
          <Input id={`${id}-result`} aria-invalid={invalid(error("result"))} maxLength={LIMITS.cert} value={cert.result ?? ""} onChange={(e) => patch({ result: e.target.value })} />
        </Field>
        <Field label="Credential ID" htmlFor={`${id}-cid`} error={error("credentialId")}>
          <Input id={`${id}-cid`} aria-invalid={invalid(error("credentialId"))} maxLength={80} placeholder="Optional" value={cert.credentialId ?? ""} onChange={(e) => patch({ credentialId: e.target.value })} />
        </Field>
        <Field
          label={isTest ? "Link to the test or your result" : "Credential URL"}
          htmlFor={`${id}-url`}
          error={error("url")}
          className="form-grid__full"
          hint={isTest ? "Where clients can see the test or check your result." : "Where clients can verify it."}
        >
          <Input id={`${id}-url`} aria-invalid={invalid(error("url"))} maxLength={500} inputMode="url" placeholder="https://…" value={cert.url ?? ""} onChange={(e) => patch({ url: e.target.value.trim() })} />
        </Field>
      </div>
      <div className="resume-cert__doc">
        {cert.documentId ? (
          <>
            <span className="resume-cert__file">
              <Icon name={cert.documentType?.startsWith("image/") ? "eye" : "invoice"} size={14} />
              {cert.documentName || "Result document"}
            </span>
            <Button size="sm" variant="outline" disabled={opening} onClick={view}>
              View
            </Button>
            <Button size="sm" variant="link" onClick={() => patch({ documentId: null, documentName: "", documentType: "" })}>
              Remove
            </Button>
          </>
        ) : (
          <label className="resume-cert__upload">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Icon name="upload" size={14} /> {upload.isPending ? "Uploading…" : "Upload certificate or result (PDF or image, up to 10 MB)"}
          </label>
        )}
      </div>
      {fileError && (
        <span className="field__error" role="alert">
          {fileError}
        </span>
      )}
      <FormError error={upload.error} />
    </EntryCard>
  );
}
