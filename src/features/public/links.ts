/**
 * Public addresses of the hosted pages (this app's own domain), for links, embed codes and "Copy link".
 * They run on the same origin as /api, so they work inside an iframe on any website.
 */
const origin = () => (typeof window === "undefined" ? "" : window.location.origin);

export const bookingUrl = (slug: string) => `${origin()}/book/${encodeURIComponent(slug)}`;
export const formUrl = (id: string) => `${origin()}/form/${id}`;
export const surveyUrl = (id: string) => `${origin()}/survey/${id}`;

/** The script that resizes embedded iframes and opens popups (public/embed.js). */
export const embedScript = () => `<script src="${origin()}/embed.js" async></script>`;

/** An iframe that grows to fit its content once embed.js is on the page. */
export function iframeEmbed(url: string, title: string, startHeight: number): string {
  const safeTitle = title.replace(/"/g, "&quot;");
  return [
    `<iframe src="${url}?embed=1" title="${safeTitle}" data-gocwgl-embed width="100%" height="${startHeight}" style="border:0;max-width:100%" loading="lazy"></iframe>`,
    embedScript(),
  ].join("\n");
}
