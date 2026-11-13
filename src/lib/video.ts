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
