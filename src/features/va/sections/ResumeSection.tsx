"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button, Field, FormError, Icon, IconButton, Input, LoadState, Select, Textarea, Toggle } from "@/components/ui";
import type { ResumeCert, ResumeJob, ResumeOut, ResumeSchool } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { openResumeDocument } from "@/utils/api/vaPortal";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { useNewResumeLink, useResume, useSaveResume, useUploadResumeDocument } from "@/utils/hooks/useVaPortal";
import { videoEmbed } from "@/lib/video";
import { ResumePaper, type ResumeContent } from "../components/ResumePaper";
import { SocialIcon, brandColor } from "../components/SocialIcon";
import { SOCIAL_NETWORKS, networkOf, normalizeLink, socialLinkOk, type SocialLink, type SocialNetwork } from "../lib/socials";
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
  const [tried, setTried] = useState(false);
  const certsIncomplete = draft.certifications.some((c) => !c.name?.trim() || !c.issuer?.trim() || !c.year?.trim());
  const linksInvalid = draft.socialLinks.some((l) => !socialLinkOk(l.network, l.url) || (l.network === "other" && !l.label?.trim()));
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(data));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  // Email is the sign-in address: shown, never sent.
  const submit = () => {
    setTried(true);
    if (certsIncomplete || linksInvalid) {
      // Show where the problem is: the first marked field.
      window.requestAnimationFrame(() => document.querySelector(".resume-form .field__error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    const rest: Omit<Draft, "email"> & { email?: string } = { ...draft };
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
          documentId: c.documentId ?? null,
        })),
        workHistory: draft.workHistory.map((j) => ({ ...j, bullets: (j.bullets ?? []).map((b) => b.trim()).filter(Boolean) })),
      },
      { onSuccess: () => setSaved(true) },
    );
  };

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
        <Button variant="primary" disabled={!dirty || save.isPending} onClick={submit}>
          {save.isPending ? "Saving…" : "Save resume"}
        </Button>
      </div>
      <PageLink data={data} />
      <FormError error={save.error} />
      {tried && (certsIncomplete || linksInvalid) && (
        <div className="field__error" role="alert">
          {certsIncomplete ? "Fill in the name, issued by and date for each certification. " : ""}
          {linksInvalid ? "Fix the social media links marked below." : ""}
        </div>
      )}

      <div className="resume-layout">
        <div className="resume-form">
          <Section title="Header" icon="user" note="Name, phone, title and location come from your VA profile.">
            <HeadshotField photoUrl={photoUrl} name={draft.name} hasPhoto={!!draft.photoId} onChange={(id) => set("photoId", id)} />
            <div className="form-grid">
              <Field label="Full name" htmlFor="rs-name">
                <Input id="rs-name" maxLength={120} value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Professional title" htmlFor="rs-title">
                <Input id="rs-title" maxLength={120} placeholder="Executive Virtual Assistant" value={draft.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="rs-email" hint="Not shown on your resume page: clients reach you through GoCWGL.">
                <Input id="rs-email" type="email" value={draft.email} disabled title="Your sign-in email. Ask the GoCWGL team to change it." />
              </Field>
              <Field label="Phone" htmlFor="rs-phone" hint="Kept on your VA profile; not shown to clients.">
                <Input id="rs-phone" maxLength={40} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Location" htmlFor="rs-loc">
                <Input id="rs-loc" maxLength={80} placeholder="Manila, Philippines" value={draft.location} onChange={(e) => set("location", e.target.value)} />
              </Field>

              <Field label="Your rate (per hour, USD)" htmlFor="rs-rate" hint="Shown on your resume. It doesn’t change what GoCWGL pays you.">
                <Input
                  id="rs-rate"
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  placeholder="e.g. 8.00"
                  value={draft.rateCents == null ? "" : (draft.rateCents / 100).toString()}
                  onChange={(e) => set("rateCents", e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value) * 100)))}
                />
              </Field>
              <Field label="Years of experience" htmlFor="rs-years">
                <Input id="rs-years" maxLength={20} placeholder="6" value={draft.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />
              </Field>
              <Field label="Availability" htmlFor="rs-avail">
                <Input id="rs-avail" maxLength={60} placeholder="40 hrs / week" value={draft.availability} onChange={(e) => set("availability", e.target.value)} />
              </Field>
              <Field label="Working hours" htmlFor="rs-hours">
                <Input id="rs-hours" maxLength={60} placeholder="US Eastern" value={draft.workingHours} onChange={(e) => set("workingHours", e.target.value)} />
              </Field>
              <Field label="Portfolio or website" htmlFor="rs-web">
                <Input id="rs-web" maxLength={500} placeholder="https://…" value={draft.website} onChange={(e) => set("website", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="About me" icon="textLong" note="Your VA profile bio.">
            <Field label="About you" htmlFor="rs-about" hint="Shown first on your resume page. 2–4 sentences on who you help, what you’re great at, and the results you bring.">
              <Textarea
                id="rs-about"
                rows={5}
                maxLength={2000}
                placeholder="I help real estate and service businesses respond to every lead within the hour…"
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </Field>
            <span className="text-small">{draft.summary.length} / 2000</span>
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
                showErrors={tried}
                onChange={(next) => set("socialLinks", draft.socialLinks.map((x, k) => (k === i ? next : x)))}
                onRemove={() => set("socialLinks", draft.socialLinks.filter((_, k) => k !== i))}
              />
            ))}
          </Section>

          <Section title="Intro video" icon="video">
            <Field
              label="Video link"
              htmlFor="rs-video"
              hint="A 1–2 minute hello: who you are, what you’re great at. Paste a YouTube, Loom or Vimeo link."
              error={draft.introVideoUrl.trim() && !videoEmbed(draft.introVideoUrl) && "Use a YouTube, Loom or Vimeo link."}
            >
              <Input
                id="rs-video"
                maxLength={500}
                placeholder="https://www.loom.com/share/…"
                value={draft.introVideoUrl}
                onChange={(e) => set("introVideoUrl", e.target.value)}
              />
            </Field>
          </Section>


          <Section title="Work experience" icon="briefcase" action={<AddButton onClick={() => set("workHistory", [...draft.workHistory, { title: "", company: "", location: "", start: "", end: "", bullets: [""] }])} />}>
            {draft.workHistory.length === 0 && <span className="vp-empty">Add your roles, most recent first.</span>}
            {draft.workHistory.map((job, i) => (
              <JobEditor
                key={i}
                job={job}
                onChange={(j) => set("workHistory", draft.workHistory.map((x, k) => (k === i ? j : x)))}
                onRemove={() => set("workHistory", draft.workHistory.filter((_, k) => k !== i))}
                onUp={i > 0 ? () => set("workHistory", swap(draft.workHistory, i, i - 1)) : undefined}
              />
            ))}
          </Section>

          <Section title="Education" icon="graduation" action={<AddButton onClick={() => set("education", [...draft.education, { school: "", degree: "", year: "" }])} />}>
            {draft.education.length === 0 && <span className="vp-empty">Schools, degrees and courses.</span>}
            {draft.education.map((ed, i) => (
              <RowEditor key={i} onRemove={() => set("education", draft.education.filter((_, k) => k !== i))}>
                <Input aria-label="School" placeholder="School" value={ed.school} onChange={(e) => set("education", update(draft.education, i, { school: e.target.value }))} />
                <Input aria-label="Degree" placeholder="Degree or course" value={ed.degree} onChange={(e) => set("education", update(draft.education, i, { degree: e.target.value }))} />
                <Input aria-label="Year" placeholder="Year" className="resume-row__year" value={ed.year} onChange={(e) => set("education", update(draft.education, i, { year: e.target.value }))} />
              </RowEditor>
            ))}
          </Section>

          <Section
            title="Certifications & test results"
            icon="circleCheck"
            note="Name, type, issued by and date are required."
            action={<AddButton onClick={() => set("certifications", [...draft.certifications, { kind: "certification", name: "", issuer: "", year: "", result: "" }])} />}
          >
            {draft.certifications.length === 0 && (
              <span className="vp-empty">Certificates, personality tests (DISC, 16 Personalities), skills tests (typing, English, Excel) — with your results.</span>
            )}
            {draft.certifications.map((c, i) => (
              <CertEditor
                key={i}
                cert={c}
                showErrors={tried}
                onChange={(next) => set("certifications", draft.certifications.map((x, k) => (k === i ? next : x)))}
                onRemove={() => set("certifications", draft.certifications.filter((_, k) => k !== i))}
              />
            ))}
          </Section>

          <Section title="Skills, tools and languages" icon="sparkle" note="Skills are your VA profile skills.">
            <Field label="Skills" htmlFor="rs-skills">
              <TagInput id="rs-skills" values={draft.skills} max={30} maxLength={40} placeholder="Inbox management, Lead follow-up…" onChange={(v) => set("skills", v)} />
            </Field>
            <Field label="Tools" htmlFor="rs-tools">
              <TagInput id="rs-tools" values={draft.tools} max={40} placeholder="HubSpot, Canva, Google Workspace…" onChange={(v) => set("tools", v)} />
            </Field>
            <Field label="Languages" htmlFor="rs-langs">
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

function JobEditor({ job, onChange, onRemove, onUp }: { job: ResumeJob; onChange: (j: ResumeJob) => void; onRemove: () => void; onUp?: () => void }) {
  const patch = (p: Partial<ResumeJob>) => onChange({ ...job, ...p });
  return (
    <div className="resume-job">
      <div className="resume-job__tools">
        {onUp && (
          <IconButton label="Move up" size="sm" onClick={onUp}>
            <Icon name="chevronUp" size={13} />
          </IconButton>
        )}
        <IconButton label="Remove role" size="sm" onClick={onRemove}>
          <Icon name="trash" size={13} />
        </IconButton>
      </div>
      <div className="form-grid">
        <Input aria-label="Job title" placeholder="Job title" value={job.title} onChange={(e) => patch({ title: e.target.value })} />
        <Input aria-label="Company" placeholder="Company" value={job.company} onChange={(e) => patch({ company: e.target.value })} />
        <Input aria-label="Location" placeholder="Location (or Remote)" value={job.location} onChange={(e) => patch({ location: e.target.value })} />
        <div className="form-grid resume-job__dates">
          <Input aria-label="Start" placeholder="Start (Jan 2022)" value={job.start} onChange={(e) => patch({ start: e.target.value })} />
          <Input aria-label="End" placeholder="End (blank = Present)" value={job.end} onChange={(e) => patch({ end: e.target.value })} />
        </div>
      </div>
      <Textarea
        aria-label="Achievements"
        rows={3}
        placeholder={"One achievement per line, e.g.\nCut inbox response time from 24h to 2h."}
        value={(job.bullets ?? []).join("\n")}
        onChange={(e) => patch({ bullets: e.target.value.split("\n").slice(0, 12) })}
      />
    </div>
  );
}

function RowEditor({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="resume-row">
      {children}
      <IconButton label="Remove" size="sm" onClick={onRemove}>
        <Icon name="trash" size={13} />
      </IconButton>
    </div>
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

function update<T extends ResumeSchool>(list: T[], i: number, patch: Partial<T>): T[] {
  return list.map((x, k) => (k === i ? { ...x, ...patch } : x));
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

const CERT_KINDS: Array<{ value: NonNullable<ResumeCert["kind"]>; label: string; placeholder: string }> = [
  { value: "certification", label: "Certification", placeholder: "HubSpot CRM" },
  { value: "personality", label: "Personality test", placeholder: "DISC assessment" },
  { value: "skills", label: "Skills test", placeholder: "Typing test" },
  { value: "other", label: "Other", placeholder: "Course or award" },
];

/** One certification or test: type, name, issuer, date (required), result, and an uploaded result document. */
function CertEditor({ cert, showErrors, onChange, onRemove }: { cert: ResumeCert; showErrors: boolean; onChange: (c: ResumeCert) => void; onRemove: () => void }) {
  const upload = useUploadResumeDocument();
  const [opening, setOpening] = useState(false);
  const kind = CERT_KINDS.find((k) => k.value === (cert.kind ?? "certification")) ?? CERT_KINDS[0];
  const id = useId();
  const patch = (p: Partial<ResumeCert>) => onChange({ ...cert, ...p });
  const missing = (v?: string) => showErrors && !v?.trim() && "Required.";

  const pick = (file: File | undefined) => {
    if (!file) return;
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
    <div className="resume-cert">
      <div className="resume-job__tools">
        <IconButton label="Remove" size="sm" onClick={onRemove}>
          <Icon name="trash" size={13} />
        </IconButton>
      </div>
      <div className="form-grid">
        <Field label="Type" htmlFor={`${id}-kind`} required>
          <Select
            id={`${id}-kind`}
            value={kind.value}
            options={CERT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
            onChange={(e) => patch({ kind: e.target.value as ResumeCert["kind"] })}
          />
        </Field>
        <Field label="Name" htmlFor={`${id}-name`} required error={missing(cert.name)}>
          <Input id={`${id}-name`} maxLength={120} placeholder={kind.placeholder} value={cert.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Issued by" htmlFor={`${id}-issuer`} required error={missing(cert.issuer)}>
          <Input id={`${id}-issuer`} maxLength={120} placeholder="Who issued it or ran the test" value={cert.issuer ?? ""} onChange={(e) => patch({ issuer: e.target.value })} />
        </Field>
        <Field label="Date" htmlFor={`${id}-year`} required error={missing(cert.year)}>
          <Input id={`${id}-year`} maxLength={40} placeholder="Oct 2026" value={cert.year ?? ""} onChange={(e) => patch({ year: e.target.value })} />
        </Field>
        <Field label="Result or score" htmlFor={`${id}-result`} hint="e.g. ENFJ, High D / I, 92%, 75 WPM" className="form-grid__full">
          <Input id={`${id}-result`} maxLength={120} value={cert.result ?? ""} onChange={(e) => patch({ result: e.target.value })} />
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
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
            <Icon name="upload" size={14} /> {upload.isPending ? "Uploading…" : "Upload result (PDF or image, up to 10 MB)"}
          </label>
        )}
      </div>
      <FormError error={upload.error} />
    </div>
  );
}

/** One social profile: network, link (on that network's site), and a name when it's "Other". */
function SocialRow({ link, showErrors, onChange, onRemove }: { link: SocialLink; showErrors: boolean; onChange: (l: SocialLink) => void; onRemove: () => void }) {
  const id = useId();
  const net = networkOf(link.network);
  const other = link.network === "other";
  const bad = (showErrors || !!link.url.trim()) && !socialLinkOk(link.network, link.url);
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
          className={`resume-social__label${showErrors && !link.label?.trim() ? " is-invalid" : ""}`}
        />
      )}
      <Field label="" htmlFor={`${id}-url`} error={bad && (other ? (link.url.trim() ? "That doesn't look like a link." : "Paste the link.") : link.url.trim() ? `Use your ${net.label} link (${net.hosts[0]}/…).` : `Paste your ${net.label} link.`)} className="resume-social__url">
        <Input
          id={`${id}-url`}
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
function HeadshotField({ photoUrl, name, hasPhoto, onChange }: { photoUrl: string | null; name: string; hasPhoto: boolean; onChange: (id: string | null) => void }) {
  const upload = useUploadResumeDocument();
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
                if (file) upload.mutate(file, { onSuccess: (doc) => onChange(doc.id) });
                e.target.value = "";
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
        <FormError error={upload.error} />
      </span>
    </div>
  );
}
