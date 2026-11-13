"use client";

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button, Field, FormError, Icon, IconButton, Input, LoadState, SegmentedControl, Select, Textarea, Toggle } from "@/components/ui";
import type { ResumeOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { isApiError } from "@/utils/errors";
import { openResumeDocument } from "@/utils/api/vaPortal";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { videoSourceFrom } from "@/lib/video";
import { countryFrom } from "@/data/countries";
import { useNewResumeLink, useResume, useSaveResume, useUploadResumeDocument } from "@/utils/hooks/useVaPortal";
import { ResumePaper, type ResumeContent } from "../components/ResumePaper";
import { SocialIcon, brandColor } from "../components/SocialIcon";
import { SOCIAL_NETWORKS, networkOf, normalizeLink, type SocialLink, type SocialNetwork } from "../lib/socials";
import { LIMITS, apiResumeErrors, certIsEmpty, uploadProblem, charCount, errorUnder, fieldLabel, validateResume, type ResumeErrors } from "../lib/resumeErrors";
import { hasSchool } from "../lib/resumeFormat";
import { AddEntryButton, CertCard, JobCard, SchoolCard, emptyCert, emptyJob, emptySchool } from "../components/ResumeEntries";
import { useVaAccess } from "../lib/access";

type Draft = ResumeContent;

const pick = (r: ResumeOut): Draft => ({
  name: r.name,
  title: r.title,
  summary: r.summary,
  email: r.email,
  phone: r.phone,
  location: r.location,
  website: r.website,
  socialLinks: (r.socialLinks ?? []).map((l) => ({ network: l.network as SocialNetwork, url: l.url, label: l.label ?? "" })),
  photoId: r.photoId ?? null,
  introVideoUrl: r.introVideoUrl,
  rateCents: r.rateCents ?? null,
  workingHours: r.workingHours,
  availability: r.availability,
  yearsExperience: r.yearsExperience,
  skills: r.skills,
  tools: r.tools,
  languages: r.languages,
  workHistory: r.workHistory,
  education: r.education,
  certifications: r.certifications,
  showGocwgl: r.showGocwgl,
});

/** VA portal › Resume: a professional resume, separate from the VA profile. Edit on the left, see it on the right. */
export function ResumeSection() {
  const query = useResume(useVaAccess().ready);
  return (
    <LoadState query={query} loadingText="Loading your resume…">
      {query.data && <ResumeEditor key={query.data.savedAt ?? "new"} data={query.data} />}
    </LoadState>
  );
}

function ResumeEditor({ data }: { data: ResumeOut }) {
  const save = useSaveResume();
  const [draft, setDraft] = useState<Draft>(() => pick(data));
  const [saved, setSaved] = useState(false);
  const photoUrl = useBlobUrl(draft.photoId ? `/va/resume/documents/${draft.photoId}` : null);
  const photoUpload = useUploadResumeDocument();
  const [tried, setTried] = useState(false);
  const check = useMemo(() => validateResume(draft), [draft]);
  // Length and format problems show as you type; "still empty" ones after the first Save click.
  const clientErrors = tried ? check.errors : Object.fromEntries(Object.entries(check.errors).filter(([k]) => !check.missing.has(k)));
  // The API's own 422 field errors (cleared on the next edit), in the same places.
  const apiErrors = isApiError(save.error) && save.error.status === 422 ? apiResumeErrors(save.error.details) : {};
  const errors: ResumeErrors = { ...apiErrors, ...clientErrors };
  const errorPaths = Object.keys(errors);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(data));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    if (save.error) save.reset();
    setDraft((d) => ({ ...d, [key]: value }));
  };
  /** Change one entry of a list, applied to the latest draft (two quick edits never undo each other). */
  const patchAt = <K extends "workHistory" | "education" | "certifications">(key: K, i: number, p: Partial<Draft[K][number]>) => {
    setSaved(false);
    if (save.error) save.reset();
    setDraft((d) => ({ ...d, [key]: (d[key] as Array<Draft[K][number]>).map((x, k) => (k === i ? { ...x, ...p } : x)) }));
  };
  /** The error under one field, and the red border on its control. */
  const err = (path: string) => errors[path];
  const inv = (path: string) => ({ "aria-invalid": errors[path] ? true : undefined });

  // The role being edited (the others show as summary cards).
  const [openJob, setOpenJob] = useState<number | null>(null);
  const jobHasError = (i: number) => Object.keys(errors).some((k) => k.startsWith(`workHistory.${i}.`));

  const showFirstError = () =>
    window.requestAnimationFrame(() => document.querySelector(".resume-form .field__error")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  // Email is the sign-in address: shown, never sent.
  const submit = () => {
    setTried(true);
    const problems = Object.keys(check.errors);
    if (problems.length) {
      // Open the first role with a problem so its field (and message) can be seen.
      const job = problems.map((k) => /^workHistory\.(\d+)\./.exec(k)?.[1]).find((x) => x !== undefined);
      if (job !== undefined) setOpenJob(Number(job));
      showFirstError();
      return;
    }
    // Entries left completely empty are dropped (the list here matches what's sent, so API errors line up).
    const cleaned: Draft = {
      ...draft,
      workHistory: draft.workHistory.filter((j) => j.title?.trim() || j.company?.trim() || j.location?.trim() || j.start || j.end || (j.bullets ?? []).some((b) => b.trim())),
      education: draft.education.filter(hasSchool),
      certifications: draft.certifications.filter((c) => !certIsEmpty(c)),
    };
    if (JSON.stringify(cleaned) !== JSON.stringify(draft)) {
      setDraft(cleaned);
      setOpenJob(null);
    }
    const rest: Omit<Draft, "email"> & { email?: string } = { ...cleaned };
    delete rest.email;
    save.mutate(
      {
        ...rest,
        name: rest.name.trim() || data.name,
        website: normalizeLink(rest.website),
        socialLinks: rest.socialLinks.map((l) => ({ network: l.network, url: normalizeLink(l.url), label: (l.label ?? "").trim() })),
        certifications: rest.certifications.map((c) => ({
          kind: c.kind ?? "certification",
          name: (c.name ?? "").trim(),
          issuer: (c.issuer ?? "").trim(),
          year: (c.year ?? "").trim(),
          result: (c.result ?? "").trim(),
          url: normalizeLink(c.url ?? ""),
          credentialId: (c.credentialId ?? "").trim(),
          documentId: c.documentId ?? null,
        })),
        workHistory: rest.workHistory.map((j) => ({ ...j, end: j.current ? "" : j.end, bullets: (j.bullets ?? []).map((b) => b.trim()).filter(Boolean) })),
      },
      { onSuccess: () => setSaved(true), onError: showFirstError },
    );
  };
  /** "Save experience": close the role if it's fine, then save the resume. */
  const saveJob = (i: number) => {
    if (Object.keys(check.errors).some((k) => k.startsWith(`workHistory.${i}.`))) {
      setTried(true);
      showFirstError();
      return;
    }
    setOpenJob(null);
    if (dirty) submit();
  };
  const addJob = () => {
    set("workHistory", [...draft.workHistory, emptyJob()]);
    setOpenJob(draft.workHistory.length);
  };
  const hasFieldErrors = errorPaths.length > 0 && (tried || Object.keys(apiErrors).length > 0);

  return (
    <div className="resume">
      <div className="resume-bar card">
        <span className="stack stack--2 u-grow">
          <strong>{data.savedAt ? "Your resume" : "Start your resume"}</strong>
          <span className="text-small">
            {data.savedAt ? `Saved ${formatLong(data.savedAt)}.` : "Save it once to get a page link you can send to clients."} Your name, phone, title,
            summary, skills and location are your VA profile details: saving here updates your profile too.
          </span>
        </span>
        {saved && !dirty && (
          <span className="resume-bar__ok">
            <Icon name="check" size={13} /> Saved
          </span>
        )}
        <Button variant="primary" disabled={!dirty || save.isPending || photoUpload.isPending} onClick={submit}>
          {save.isPending ? "Saving…" : photoUpload.isPending ? "Uploading photo…" : "Save resume"}
        </Button>
      </div>
      <PageLink data={data} />
      {hasFieldErrors ? <ErrorSummary paths={errorPaths} /> : <FormError error={save.error} />}

      <div className="resume-layout">
        <div className="resume-form">
          <Section title="Header" icon="user" note="Name, phone, title and location come from your VA profile.">
            <HeadshotField upload={photoUpload} photoUrl={photoUrl} name={draft.name} hasPhoto={!!draft.photoId} error={err("photoId")} onChange={(id) => set("photoId", id)} />
            <div className="form-grid">
              <Field label="Full name" htmlFor="rs-name" required error={err("name")}>
                <Input id="rs-name" {...inv("name")} maxLength={120} value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Professional title" htmlFor="rs-title" required error={err("title")}>
                <Input id="rs-title" {...inv("title")} maxLength={120} placeholder="Executive Virtual Assistant" value={draft.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="rs-email" required hint="Not shown on your resume page: clients reach you through GoCWGL.">
                <Input id="rs-email" type="email" value={draft.email} disabled title="Your sign-in email. Ask the GoCWGL team to change it." />
              </Field>
              <Field label="Phone" htmlFor="rs-phone" error={err("phone")} hint="Kept on your VA profile; not shown to clients.">
                <Input id="rs-phone" {...inv("phone")} maxLength={40} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Location" htmlFor="rs-loc" error={err("location")}>
                <Input id="rs-loc" {...inv("location")} maxLength={80} placeholder="Manila, Philippines" value={draft.location} onChange={(e) => set("location", e.target.value)} />
              </Field>

              <Field label="Your rate (per hour, USD)" htmlFor="rs-rate" required error={err("rateCents")} hint="Shown on your resume. It doesn’t change what GoCWGL pays you.">
                <Input
                  id="rs-rate"
                  {...inv("rateCents")}
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  placeholder="e.g. 8.00"
                  value={draft.rateCents == null ? "" : (draft.rateCents / 100).toString()}
                  onChange={(e) => set("rateCents", e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value) * 100)))}
                />
              </Field>
              <Field label="Years of experience" htmlFor="rs-years" error={err("yearsExperience")}>
                <Input id="rs-years" {...inv("yearsExperience")} maxLength={20} placeholder="6" value={draft.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />
              </Field>
              <Field label="Availability" htmlFor="rs-avail" error={err("availability")}>
                <Input id="rs-avail" {...inv("availability")} maxLength={60} placeholder="40 hrs / week" value={draft.availability} onChange={(e) => set("availability", e.target.value)} />
              </Field>
              <Field label="Working hours" htmlFor="rs-hours" error={err("workingHours")}>
                <Input id="rs-hours" {...inv("workingHours")} maxLength={60} placeholder="US Eastern" value={draft.workingHours} onChange={(e) => set("workingHours", e.target.value)} />
              </Field>
              <Field label="Portfolio or website" htmlFor="rs-web" error={err("website")}>
                <Input id="rs-web" {...inv("website")} maxLength={500} placeholder="https://…" value={draft.website} onChange={(e) => set("website", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="About me" icon="textLong" note="Your VA profile bio.">
            <Field label="About you" htmlFor="rs-about" error={err("summary")} hint="Shown first on your resume page. 2–4 sentences on who you help, what you’re great at, and the results you bring.">
              <Textarea
                id="rs-about"
                {...inv("summary")}
                rows={5}
                maxLength={2000}
                placeholder="I help real estate and service businesses respond to every lead within the hour…"
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </Field>
            <span className="text-small">{charCount(draft.summary)} / {LIMITS.summary}</span>
          </Section>

          <Section
            title="Social media"
            icon="share"
            note="LinkedIn, Facebook, Upwork… they show on your resume page."
            action={
              <AddButton
                onClick={() => set("socialLinks", [...draft.socialLinks, { network: draft.socialLinks.length ? "facebook" : "linkedin", url: "", label: "" }])}
              />
            }
          >
            {draft.socialLinks.length === 0 && <span className="vp-empty">Add LinkedIn, Facebook, Instagram, Upwork, OnlineJobs.ph, GitHub and more.</span>}
            {draft.socialLinks.map((l, i) => (
              <SocialRow
                key={i}
                link={l}
                urlError={err(`socialLinks.${i}.url`) ?? err(`socialLinks.${i}`)}
                labelError={err(`socialLinks.${i}.label`)}
                onChange={(next) => set("socialLinks", draft.socialLinks.map((x, k) => (k === i ? next : x)))}
                onRemove={() => set("socialLinks", draft.socialLinks.filter((_, k) => k !== i))}
              />
            ))}
          </Section>

          <Section title="Intro video" icon="video">
            <IntroVideoField value={draft.introVideoUrl} error={err("introVideoUrl")} onChange={(v) => set("introVideoUrl", v)} />
          </Section>


          <Section title="Work experience" icon="briefcase" note="Most recent first. Save each role when it’s done.">
            {draft.workHistory.length === 0 && <span className="vp-empty">Add the roles you’ve held: title, company, dates and what you achieved.</span>}
            {draft.workHistory.map((job, i) => (
              <JobCard
                key={i}
                job={job}
                editing={openJob === i}
                hasError={jobHasError(i)}
                saving={save.isPending}
                error={(k) => (k === "bullets" ? errorUnder(errors, `workHistory.${i}.bullets`) : err(`workHistory.${i}.${k}`))}
                onEdit={() => setOpenJob(i)}
                onChange={(p) => patchAt("workHistory", i, p)}
                onSave={() => saveJob(i)}
                onRemove={() => {
                  set("workHistory", draft.workHistory.filter((_, k) => k !== i));
                  setOpenJob((o) => (o === i ? null : o !== null && o > i ? o - 1 : o));
                }}
                onUp={
                  i > 0
                    ? () => {
                        set("workHistory", swap(draft.workHistory, i, i - 1));
                        setOpenJob((o) => (o === i ? i - 1 : o === i - 1 ? i : o));
                      }
                    : undefined
                }
              />
            ))}
            <AddEntryButton onClick={addJob}>{draft.workHistory.length ? "Add another experience" : "Add work experience"}</AddEntryButton>
          </Section>

          <Section title="Education" icon="graduation" note="Optional. Search your school, then add your degree and years.">
            {draft.education.map((ed, i) => (
              <SchoolCard
                key={i}
                school={ed}
                error={(k) => err(`education.${i}.${k}`)}
                onChange={(p) => patchAt("education", i, p)}
                onRemove={() => set("education", draft.education.filter((_, k) => k !== i))}
              />
            ))}
            <AddEntryButton onClick={() => set("education", [...draft.education, emptySchool(countryFrom(draft.location))])}>{draft.education.length ? "Add another school" : "Add education"}</AddEntryButton>
          </Section>

          <Section title="Certifications & test results" icon="circleCheck" note="Optional. Certificates, personality and skills tests, with your score and a link clients can check.">
            {draft.certifications.map((c, i) => (
              <CertCard
                key={i}
                cert={c}
                error={(k) => err(`certifications.${i}.${k}`)}
                onChange={(p) => patchAt("certifications", i, p)}
                onRemove={() => set("certifications", draft.certifications.filter((_, k) => k !== i))}
              />
            ))}
            <AddEntryButton onClick={() => set("certifications", [...draft.certifications, emptyCert()])}>
              {draft.certifications.length ? "Add another certification or test" : "Add a certification or test"}
            </AddEntryButton>
          </Section>

          <Section title="Skills, tools and languages" icon="sparkle" note="Skills are your VA profile skills.">
            <Field label="Skills" htmlFor="rs-skills" error={errorUnder(errors, "skills")}>
              <TagInput id="rs-skills" values={draft.skills} max={30} maxLength={40} placeholder="Inbox management, Lead follow-up…" onChange={(v) => set("skills", v)} />
            </Field>
            <Field label="Tools" htmlFor="rs-tools" error={errorUnder(errors, "tools")}>
              <TagInput id="rs-tools" values={draft.tools} max={40} placeholder="HubSpot, Canva, Google Workspace…" onChange={(v) => set("tools", v)} />
            </Field>
            <Field label="Languages" htmlFor="rs-langs" error={errorUnder(errors, "languages")}>
              <TagInput id="rs-langs" values={draft.languages} max={15} placeholder="English (fluent), Filipino (native)…" onChange={(v) => set("languages", v)} />
            </Field>
          </Section>

          <Section title="GoCWGL experience" icon="star">
            <Toggle checked={draft.showGocwgl} onChange={(v) => set("showGocwgl", v)} label="Show my GoCWGL work on my resume" showLabel />
            <span className="text-small">Adds your hours tracked, active clients, client rating and passed trainings, straight from your work here.</span>
          </Section>
        </div>

        <div className="resume-preview">
          <span className="kicker kicker--sm kicker--muted">PREVIEW</span>
          <ResumePaper
            d={draft}
            memberSince={data.memberSince}
            updatedAt={data.savedAt}
            h={data.highlights}
            editor
            openDocument={(docId) => void openResumeDocument(docId)}
            pageUrl={data.shareSlug && data.isPublic && typeof window !== "undefined" ? `${window.location.origin}/resume/${data.shareSlug}` : undefined}
            photoUrl={photoUrl}
            onAddLink={() => {
              const field = document.getElementById("rs-web");
              field?.scrollIntoView({ behavior: "smooth", block: "center" });
              field?.focus({ preventScroll: true });
            }}
          />
          <span className="text-small">This is what clients see on your page.</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Editor pieces
/**
 * The intro video: a link (one line) or a video host's embed code (a big box, so the whole code shows).
 * Either way only the player link is saved, never the pasted HTML; for embed code it's shown under the box.
 */
function IntroVideoField({ value, error, onChange }: { value: string; error?: string; onChange: (link: string) => void }) {
  const [mode, setMode] = useState<"link" | "embed">("link");
  const [code, setCode] = useState("");
  const src = mode === "embed" && code.trim() ? videoSourceFrom(code) : null;
  // Switching only changes the box; the saved video stays until something new is pasted.
  const switchTo = (next: "link" | "embed") => {
    setMode(next);
    setCode("");
  };

  return (
    <div className="stack stack--10">
      <SegmentedControl
        label="How you're adding the video"
        size="sm"
        variant="soft"
        value={mode}
        onChange={switchTo}
        options={[
          { value: "link", label: "Video link" },
          { value: "embed", label: "Embed code" },
        ]}
      />
      {mode === "link" ? (
        <Field
          label="Video link"
          htmlFor="rs-video"
          error={error}
          hint="A 1–2 minute hello: who you are, what you’re great at. YouTube, Loom, Vimeo, Google Drive or a video file link."
        >
          <Input
            id="rs-video"
            aria-invalid={error ? true : undefined}
            maxLength={1000}
            inputMode="url"
            placeholder="https://www.loom.com/share/…"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              // Pasted embed code here? Switch to the embed box with it.
              if (v.includes("<")) {
                setMode("embed");
                setCode(v);
                onChange(videoSourceFrom(v) ?? v);
              } else onChange(v);
            }}
          />
        </Field>
      ) : (
        <Field
          label="Embed code"
          htmlFor="rs-video"
          error={error}
          hint={
            src
              ? `Plays from: ${src}`
              : "From your video host: Share › Embed › Copy. Any host works (Wistia, Vidyard, Dailymotion, Facebook…)."
          }
        >
          <Textarea
            id="rs-video"
            className="resume-embed"
            aria-invalid={error ? true : undefined}
            rows={6}
            maxLength={4000}
            spellCheck={false}
            placeholder={'<iframe src="https://…" width="640" height="360" allowfullscreen></iframe>'}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              onChange(videoSourceFrom(e.target.value) ?? e.target.value);
            }}
          />
        </Field>
      )}
      {mode === "embed" && !code && value && <span className="text-small">Saved video: {value}. Paste new embed code above to replace it.</span>}
    </div>
  );
}

/** Above the form: which fields to fix, by name (each one is also marked under the field). */
function ErrorSummary({ paths }: { paths: string[] }) {
  const names = [...new Set(paths.map(fieldLabel))];
  const shown = names.slice(0, 6);
  return (
    <div className="form-error" role="alert">
      {names.length === 1 ? "Fix this field to save: " : `Fix these ${names.length} fields to save: `}
      {shown.join(", ")}
      {names.length > shown.length ? `, and ${names.length - shown.length} more` : ""}. The problem is shown under each one.
    </div>
  );
}

function Section({
  title,
  icon,
  note,
  action,
  children,
}: {
  title: string;
  icon: "user" | "textLong" | "briefcase" | "graduation" | "circleCheck" | "sparkle" | "star" | "video" | "share";
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card resume-section">
      <header className="resume-section__head">
        <span className="resume-section__icon" aria-hidden="true">
          <Icon name={icon} size={14} />
        </span>
        <span className="stack stack--2">
          <h3>{title}</h3>
          {note && (
            <span className="resume-section__note">
              <Icon name="link" size={10} /> {note}
            </span>
          )}
        </span>
        <span className="u-spacer" />
        {action}
      </header>
      {children}
    </section>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Icon name="plus" size={12} /> Add
    </Button>
  );
}

/** Type and press Enter (or a comma) to add; × to remove. */
function TagInput({
  id,
  values,
  max,
  maxLength = 60,
  placeholder,
  onChange,
}: {
  id: string;
  values: string[];
  max: number;
  maxLength?: number;
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const items = raw
      .split(",")
      .map((s) => s.trim().slice(0, maxLength))
      .filter((s) => s && !values.includes(s));
    if (items.length) onChange([...values, ...items].slice(0, max));
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  return (
    <div className="tag-input">
      {values.map((v) => (
        <span key={v} className="tag-input__chip">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
            <Icon name="close" size={10} />
          </button>
        </span>
      ))}
      <input id={id} value={text} placeholder={values.length ? "" : placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => text && add(text)} />
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** The page link clients open, with on/off, copy and "new link". */
function PageLink({ data }: { data: ResumeOut }) {
  const save = useSaveResume();
  const reset = useNewResumeLink();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const url = data.shareSlug && typeof window !== "undefined" ? `${window.location.origin}/resume/${data.shareSlug}` : "";

  if (!data.shareSlug) {
    return (
      <div className="card resume-link is-empty">
        <Icon name="link" size={16} />
        <span className="text-small">Save your resume to get a page link for clients.</span>
      </div>
    );
  }
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`card resume-link${data.isPublic ? "" : " is-off"}`}>
      <span className="resume-link__icon" aria-hidden="true">
        <Icon name="globe" size={16} />
      </span>
      <span className="stack stack--2 u-grow u-minw0">
        <strong>Resume page</strong>
        {data.isPublic ? (
          <a className="resume-link__url" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        ) : (
          <span className="text-small">Turned off: the link shows nothing until you turn it back on.</span>
        )}
      </span>
      <Toggle checked={data.isPublic} onChange={(on) => save.mutate({ isPublic: on })} label={data.isPublic ? "Page is on" : "Page is off"} showLabel />
      {data.isPublic && (
        <>
          <Button variant="outline" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Copied" : "Copy link"}
          </Button>
          <a className="btn btn--outline" href={url} target="_blank" rel="noreferrer">
            <Icon name="eye" size={13} /> Open
          </a>
        </>
      )}
      {confirm ? (
        <Button variant="danger-solid" size="sm" disabled={reset.isPending} onClick={() => reset.mutate(undefined, { onSuccess: () => setConfirm(false) })}>
          Old link stops working — continue
        </Button>
      ) : (
        <Button variant="link" size="sm" onClick={() => setConfirm(true)}>
          New link
        </Button>
      )}
      <FormError error={save.error ?? reset.error} />
    </div>
  );
}

/** One social profile: network, link (on that network's site), and a name when it's "Other". */
function SocialRow({
  link,
  urlError,
  labelError,
  onChange,
  onRemove,
}: {
  link: SocialLink;
  urlError?: string;
  labelError?: string;
  onChange: (l: SocialLink) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const net = networkOf(link.network);
  const other = link.network === "other";
  return (
    <div className={`resume-social${other ? " is-other" : ""}`}>
      <span className="rp-doc__kind rp-doc__kind--brand" style={{ ["--brand" as string]: brandColor(link.network) }} aria-hidden="true">
        <SocialIcon network={link.network} size={16} />
      </span>
      <Select
        aria-label="Network"
        value={link.network}
        options={SOCIAL_NETWORKS.map((n) => ({ value: n.key, label: n.label }))}
        onChange={(e) => onChange({ ...link, network: e.target.value as SocialNetwork })}
      />
      {other && (
        <Input
          aria-label="Name"
          maxLength={60}
          placeholder="Name it (Canva portfolio)"
          value={link.label ?? ""}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
          aria-invalid={labelError ? true : undefined}
          title={labelError}
          className="resume-social__label"
        />
      )}
      <Field label="" htmlFor={`${id}-url`} error={[urlError, labelError].filter(Boolean).join(" ") || undefined} className="resume-social__url">
        <Input
          id={`${id}-url`}
          aria-invalid={urlError ? true : undefined}
          aria-label={`${net.label} link`}
          maxLength={300}
          placeholder={other ? "yoursite.com/page" : `${net.hosts[0]}/yourname`}
          value={link.url}
          onChange={(e) => onChange({ ...link, url: e.target.value.trim() })}
        />
      </Field>
      <IconButton label="Remove" size="sm" onClick={onRemove}>
        <Icon name="trash" size={13} />
      </IconButton>
    </div>
  );
}

/** The headshot: a round preview, upload (PNG, JPG or WebP) and remove. */
function HeadshotField({
  upload,
  photoUrl,
  name,
  hasPhoto,
  error,
  onChange,
}: {
  /** Owned by the editor, so Save waits for a photo that's still uploading. */
  upload: ReturnType<typeof useUploadResumeDocument>;
  photoUrl: string | null;
  name: string;
  hasPhoto: boolean;
  error?: string;
  onChange: (id: string | null) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "VA";
  return (
    <div className="resume-photo">
      <span className={`resume-photo__preview${photoUrl ? " has-photo" : ""}`}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- your own upload
          <img src={photoUrl} alt="Your headshot" />
        ) : (
          initials
        )}
      </span>
      <span className="stack stack--4">
        <strong>Headshot</strong>
        <span className="text-small">A clear, friendly photo of your face. It shows on your resume page and in the PDF.</span>
        <span className="cluster cluster--8">
          <label className="resume-cert__upload">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const problem = uploadProblem(file, "photo");
                setFileError(problem);
                if (problem) return;
                upload.reset();
                upload.mutate(file, { onSuccess: (doc) => onChange(doc.id) });
              }}
            />
            <Icon name="upload" size={14} /> {upload.isPending ? "Uploading…" : hasPhoto ? "Replace photo" : "Upload photo"}
          </label>
          {hasPhoto && (
            <Button size="sm" variant="link" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </span>
        {fileError && (
          <span className="field__error" role="alert">
            {fileError}
          </span>
        )}
        <FormError error={upload.error} />
        {error && (
          <span className="field__error" role="alert">
            {error}
          </span>
        )}
      </span>
    </div>
  );
}
