import { bookingUrl, embedScript, iframeEmbed } from "@/features/public/links";
import type { CalendarOut } from "@/utils/api/models";

export type BookingEmbedMode = "inline" | "popup" | "link";

/** Snippet that puts a calendar's booking page (/book/{slug}) on another website, or its plain link. */
export function bookingEmbed(cal: Pick<CalendarOut, "slug" | "name">, mode: BookingEmbedMode, opts: { height: number; button: string }): string {
  const url = bookingUrl(cal.slug);
  if (mode === "link") return url;
  if (mode === "popup") {
    const label = (opts.button || "Book a call").replace(/</g, "&lt;");
    return [`<!-- ${cal.name} (popup) -->`, `<button type="button" data-gocwgl-popup="${url}">${label}</button>`, embedScript()].join("\n");
  }
  return [`<!-- ${cal.name} -->`, iframeEmbed(url, cal.name, opts.height)].join("\n");
}
