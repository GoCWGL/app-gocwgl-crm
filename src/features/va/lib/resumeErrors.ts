import type { ResumeCert } from "@/utils/api/models";
import type { ResumeContent } from "../components/ResumePaper";
import { resumeVideo, videoSourceFrom } from "@/lib/video";
import { dateOrder, parseMonthYear } from "./resumeFormat";
import { networkOf, normalizeLink, socialLinkOk } from "./socials";

/**
 * The resume's limits (same as the API's ResumeIn) and a check of every field before saving.
 * Errors are keyed by the API's own field paths (`title`, `workHistory.0.bullets.2`), so a 422
 * from the API lands in the same place under the same field.
 */
export const LIMITS = {
  name: 120,
  title: 120,
  summary: 2000,
  phone: 40,
  location: 80,
  website: 500,
  introVideoUrl: 1000,
  workingHours: 60,
  availability: 60,
  yearsExperience: 20,
  skill: 40,
  tag: 60,
  job: 120,
  jobDate: 40,
  bullet: 500,
  bullets: 12,
  school: 120,
  schoolYear: 40,
  cert: 120,
  certYear: 40,
} as const;

export const MAX_RATE_CENTS = 100_000_00;

/** Characters as the API counts them (code points, after trimming). */
export const charCount = (s: string | null | undefined) => [...(s ?? "").trim()].length;


export type ResumeErrors = Record<string, string>;

const tooLong = (max: number, len: number) => `Too long: ${len} characters. Keep it to ${max}.`;

/**
 * Every problem, plus which ones are only "still empty" (shown after the first Save click, so a row
 * you just added isn't red while you fill it in). Length and format problems show as you type.
 */
export function validateResume(d: ResumeContent): { errors: ResumeErrors; missing: Set<string> } {
  const e: ResumeErrors = {};
  const missing = new Set<string>();
  const need = (path: string, message: string) => {
    e[path] = message;
    missing.add(path);
  };
  const max = (path: string, value: string | null | undefined, limit: number) => {
    const n = charCount(value);
    if (n > limit) e[path] = tooLong(limit, n);
  };

  // Required: name, professional title and rate (email is the sign-in address, always there).
  if (!d.name.trim()) need("name", "Enter your full name.");
  max("name", d.name, LIMITS.name);
  if (!d.title.trim()) need("title", "Add your professional title, like “Executive Virtual Assistant”.");
  max("title", d.title, LIMITS.title);
  if (d.rateCents == null) need("rateCents", "Enter your hourly rate in USD.");
  max("summary", d.summary, LIMITS.summary);
  max("phone", d.phone, LIMITS.phone);
  max("location", d.location, LIMITS.location);
  max("workingHours", d.workingHours, LIMITS.workingHours);
  max("availability", d.availability, LIMITS.availability);
  max("yearsExperience", d.yearsExperience, LIMITS.yearsExperience);

  const site = normalizeLink(d.website);
  if (site && /\s/.test(site)) e.website = "Use a full link with no spaces, like https://yoursite.com.";
  max("website", site, LIMITS.website);

  const video = d.introVideoUrl.trim();
  if (video && !resumeVideo(video))
    e.introVideoUrl = video.includes("<") ? "We couldn't find a video player in that embed code. Copy it again from the video's Share › Embed." : "Use a full https link to your video, or paste its embed code.";
  max("introVideoUrl", videoSourceFrom(video) ?? video, LIMITS.introVideoUrl);

  if (d.rateCents != null && (!Number.isFinite(d.rateCents) || d.rateCents < 0 || d.rateCents > MAX_RATE_CENTS)) {
    e.rateCents = "Enter an hourly rate like 8 or 8.50.";
  }

  d.socialLinks.forEach((l, i) => {
    const net = networkOf(l.network);
    if (!l.url.trim()) need(`socialLinks.${i}.url`, l.network === "other" ? "Paste the link." : `Paste your ${net.label} link.`);
    else if (!socialLinkOk(l.network, l.url))
      e[`socialLinks.${i}.url`] = l.network === "other" ? "That doesn't look like a link." : `Use your ${net.label} link (${net.hosts[0]}/…).`;
    else max(`socialLinks.${i}.url`, normalizeLink(l.url), 300);
    if (l.network === "other" && !l.label?.trim()) need(`socialLinks.${i}.label`, "Give the link a name.");
    max(`socialLinks.${i}.label`, l.label, 60);
  });

  d.skills.forEach((s, i) => max(`skills.${i}`, s, LIMITS.skill));
  d.tools.forEach((s, i) => max(`tools.${i}`, s, LIMITS.tag));
  d.languages.forEach((s, i) => max(`languages.${i}`, s, LIMITS.tag));

  /** A picked month needs its year; an end can't come before the start. */
  const dates = (prefix: string, start: string | null | undefined, end: string | null | undefined, startKey = "start", endKey = "end") => {
    for (const [key, v] of [[startKey, start], [endKey, end]] as const) {
      const p = parseMonthYear(v);
      if (p.month && !p.year) e[`${prefix}.${key}`] = "Pick the year too.";
    }
    const a = dateOrder(start);
    const b = dateOrder(end);
    if (a != null && b != null && b < a) e[`${prefix}.${endKey}`] ??= "The end date is before the start date.";
  };

  d.workHistory.forEach((j, i) => {
    max(`workHistory.${i}.title`, j.title, LIMITS.job);
    max(`workHistory.${i}.company`, j.company, LIMITS.job);
    max(`workHistory.${i}.location`, j.location, LIMITS.job);
    max(`workHistory.${i}.start`, j.start, LIMITS.jobDate);
    max(`workHistory.${i}.end`, j.end, LIMITS.jobDate);
    dates(`workHistory.${i}`, j.start, j.current ? "" : j.end);
    const lines = (j.bullets ?? []).map((b) => b.trim()).filter(Boolean);
    lines.forEach((b, k) => {
      const n = charCount(b);
      if (n > LIMITS.bullet) e[`workHistory.${i}.bullets.${k}`] = `Line ${k + 1} is ${n} characters. Keep each achievement to ${LIMITS.bullet}, or split it into two lines.`;
    });
  });

  d.education.forEach((s, i) => {
    max(`education.${i}.school`, s.school, LIMITS.school);
    max(`education.${i}.degree`, s.degree, LIMITS.school);
    max(`education.${i}.field`, s.field, LIMITS.school);
    max(`education.${i}.country`, s.country, 80);
    max(`education.${i}.start`, s.start, 20);
    max(`education.${i}.end`, s.end, 20);
    dates(`education.${i}`, s.start, s.end);
  });

  d.certifications.forEach((c, i) => {
    // Empty entries are dropped on save; one with anything in it needs its name.
    if (certIsEmpty(c)) return;
    if (!c.name?.trim()) need(`certifications.${i}.name`, "Add the certification or test name, or remove this entry.");
    max(`certifications.${i}.name`, c.name, LIMITS.cert);
    max(`certifications.${i}.issuer`, c.issuer, LIMITS.cert);
    max(`certifications.${i}.year`, c.year, LIMITS.certYear);
    max(`certifications.${i}.result`, c.result, LIMITS.cert);
    max(`certifications.${i}.credentialId`, c.credentialId, 80);
    const p = parseMonthYear(c.year);
    if (p.month && !p.year) e[`certifications.${i}.year`] = "Pick the year too.";
    const url = normalizeLink(c.url ?? "");
    if (url && (/\s/.test(url) || !/^https:\/\/[^/\s]+\.[^/\s]+/.test(url))) e[`certifications.${i}.url`] = "Use a full link, like https://verify.example.com/123.";
    max(`certifications.${i}.url`, url, 500);
  });

  return { errors: e, missing };
}

/**
 * The API's 422 field errors keyed by full path, cleaned up for people. Achievement lines come back
 * as `workHistory.0.bullets.2`; the editor shows them under that job's achievements box.
 */
export function apiResumeErrors(details: unknown): ResumeErrors {
  if (!Array.isArray(details)) return {};
  const out: ResumeErrors = {};
  for (const item of details as Array<{ field?: unknown; message?: unknown }>) {
    if (typeof item?.field !== "string") continue;
    let msg = String(item.message ?? "").replace(/^Value error,\s*/i, "");
    const m = /at most (\d+) characters?/.exec(msg);
    if (m) msg = `Too long. Keep it to ${m[1]} characters.`;
    out[item.field] ??= msg;
  }
  return out;
}

const SECTION: Record<string, string> = {
  name: "Full name",
  title: "Professional title",
  summary: "About you",
  phone: "Phone",
  location: "Location",
  website: "Portfolio or website",
  introVideoUrl: "Intro video link",
  workingHours: "Working hours",
  availability: "Availability",
  yearsExperience: "Years of experience",
  rateCents: "Your rate",
  photoId: "Headshot",
};

const JOB: Record<string, string> = { title: "job title", company: "company", location: "location", start: "start date", end: "end date" };
const SCHOOL: Record<string, string> = { country: "country", school: "school", degree: "degree", field: "course", start: "start year", end: "end year", year: "year" };
const CERT: Record<string, string> = { name: "name", issuer: "issuing organization", year: "date", result: "score", kind: "type", url: "link", credentialId: "credential ID" };

/** "workHistory.0.bullets.2" → "Work experience 1: achievement line 3". */
export function fieldLabel(path: string): string {
  const [head, a, b, c] = path.split(".");
  const n = Number(a) + 1;
  switch (head) {
    case "workHistory":
      if (b === "bullets") return c !== undefined ? `Work experience ${n}: achievement line ${Number(c) + 1}` : `Work experience ${n}: achievements`;
      return `Work experience ${n}${b ? `: ${JOB[b] ?? b}` : ""}`;
    case "education":
      return `Education ${n}${b ? `: ${SCHOOL[b] ?? b}` : ""}`;
    case "certifications":
      return `Certification ${n}${b ? `: ${CERT[b] ?? b}` : ""}`;
    case "socialLinks":
      return `Social link ${n}${b === "label" ? ": name" : ""}`;
    case "skills":
      return a !== undefined ? `Skill ${n}` : "Skills";
    case "tools":
      return a !== undefined ? `Tool ${n}` : "Tools";
    case "languages":
      return a !== undefined ? `Language ${n}` : "Languages";
    default:
      return SECTION[head] ?? head;
  }
}

/** The first error under a path or anything inside it (`workHistory.0.bullets` → any of its lines). */
export function errorUnder(errors: ResumeErrors, prefix: string): string | undefined {
  if (errors[prefix]) return errors[prefix];
  const key = Object.keys(errors).find((k) => k.startsWith(`${prefix}.`));
  return key ? errors[key] : undefined;
}

/** Nothing filled in (the type alone doesn't count). */
export const certIsEmpty = (c: ResumeCert) =>
  !(c.name?.trim() || c.issuer?.trim() || c.year?.trim() || c.result?.trim() || c.url?.trim() || c.credentialId?.trim() || c.documentId);

const MB = 1024 * 1024;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_EXT = /\.(png|jpe?g|webp)$/i;
const DOC_EXT = /\.(pdf|png|jpe?g|webp)$/i;

/** Why a file can't be uploaded (same rules as the API), or null when it's fine. Checked before sending it. */
export function uploadProblem(file: File, kind: "photo" | "document"): string | null {
  const okType = kind === "photo" ? PHOTO_TYPES.includes(file.type) || PHOTO_EXT.test(file.name) : file.type === "application/pdf" || PHOTO_TYPES.includes(file.type) || DOC_EXT.test(file.name);
  if (!okType) return kind === "photo" ? "Use a PNG, JPG or WebP photo." : "Upload a PDF or an image (PNG, JPG or WebP).";
  if (file.size > 10 * MB) return `That file is ${(file.size / MB).toFixed(1)} MB. Use one under 10 MB.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}
