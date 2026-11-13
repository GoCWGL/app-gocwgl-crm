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

// ------------------------------------------------------------------ Training lessons

export type VideoProvider = "youtube" | "loom" | "vimeo";
/** A training lesson's video as the API returns it (Vimeo unlisted: videoId "123456/hash"). */
export type LessonVideoSource = { provider: VideoProvider; videoId: string };

export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = PROVIDER_LABEL;

/** The provider's player for a lesson, starting on its own when `autoplay` (the viewer already pressed play). */
export function lessonPlayerSrc({ provider, videoId }: LessonVideoSource, autoplay = false): string {
  const play = autoplay ? "&autoplay=1" : "";
  if (provider === "loom") return `https://www.loom.com/embed/${encodeURIComponent(videoId)}?hide_owner=true&hide_share=true&hide_title=true${play}`;
  if (provider === "vimeo") {
    const [id, hash] = videoId.split("/");
    return `https://player.vimeo.com/video/${encodeURIComponent(id)}?dnt=1&title=0&byline=0${hash ? `&h=${encodeURIComponent(hash)}` : ""}${play}`;
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1${play}`;
}

/** Where the video lives, for the player's caption ("vimeo.com/871831715"). */
export function lessonVideoHost({ provider, videoId }: LessonVideoSource): string {
  if (provider === "loom") return `loom.com/share/${videoId.slice(0, 10)}…`;
  if (provider === "vimeo") return `vimeo.com/${videoId.split("/")[0]}`;
  return `youtu.be/${videoId}`;
}

/** A poster image for the lesson (only YouTube gives one without an API call). */
export const lessonThumb = ({ provider, videoId }: LessonVideoSource): string | null =>
  provider === "youtube" && videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

/** "12 min", "1h 40m"; "" when there's no length. */
export function formatMinutes(total: number): string {
  if (!total) return "";
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
