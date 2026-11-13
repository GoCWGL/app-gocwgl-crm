import { youtubeId } from "./youtube";

/** A YouTube, Loom or Vimeo link → the player URL to embed (privacy-friendly where the provider allows). */
export function videoEmbed(url: string): { provider: "youtube" | "loom" | "vimeo"; src: string } | null {
  const u = url.trim();
  if (!u) return null;
  const yt = youtubeId(u);
  if (yt) return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1` };
  const loom = /^https:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/.exec(u);
  if (loom) return { provider: "loom", src: `https://www.loom.com/embed/${loom[1]}?hide_owner=true&hide_share=true&hide_title=true` };
  const vimeo = /^https:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (vimeo) return { provider: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1&title=0&byline=0` };
  return null;
}

/**
 * What a VA pastes for their intro video (a link, or a player's embed code) → the player link to keep, or null.
 * Only the link is kept, never the pasted HTML. Players must be https.
 */
export function videoSourceFrom(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (raw.includes("<")) {
    const m = /<(?:iframe|video|source|embed)\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i.exec(raw);
    if (!m) return null;
    raw = m[1].replace(/&amp;/g, "&").replace(/&#38;/g, "&").trim();
  }
  if (raw.startsWith("//")) raw = `https:${raw}`;
  if (/^http:\/\//i.test(raw)) raw = `https://${raw.slice(7)}`;
  if (/\s/.test(raw)) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.includes(".") ? u.href : null;
  } catch {
    return null;
  }
}

export type ResumeVideo = {
  /** youtube/loom/vimeo: their own player · file: a video file (played here) · embed: any other host's player. */
  kind: "youtube" | "loom" | "vimeo" | "file" | "embed";
  src: string;
  /** Where it's from, for the caption ("YouTube", "wistia.com"). */
  label: string;
};

const PROVIDER_LABEL = { youtube: "YouTube", loom: "Loom", vimeo: "Vimeo" } as const;

/** A resume intro video's saved link → how to play it (any https video host works). */
export function resumeVideo(link: string): ResumeVideo | null {
  const src = videoSourceFrom(link);
  if (!src) return null;
  const known = videoEmbed(src);
  if (known) return { kind: known.provider, src: known.src, label: PROVIDER_LABEL[known.provider] };
  const u = new URL(src);
  const host = u.hostname.replace(/^www\./, "");
  // Google Drive's share link → its player.
  const drive = /^\/file\/d\/([^/]+)/.exec(u.pathname);
  if (host === "drive.google.com" && drive) return { kind: "embed", src: `https://drive.google.com/file/d/${drive[1]}/preview`, label: "Google Drive" };
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(u.pathname)) return { kind: "file", src, label: host };
  return { kind: "embed", src, label: host };
}
