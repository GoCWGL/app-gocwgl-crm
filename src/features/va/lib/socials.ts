/** Social networks a VA can link on their resume (same list and rules as the API). */
export const SOCIAL_NETWORKS = [
  { key: "linkedin", label: "LinkedIn", short: "in", hosts: ["linkedin.com"] },
  { key: "facebook", label: "Facebook", short: "f", hosts: ["facebook.com", "fb.com"] },
  { key: "instagram", label: "Instagram", short: "IG", hosts: ["instagram.com"] },
  { key: "x", label: "X (Twitter)", short: "X", hosts: ["x.com", "twitter.com"] },
  { key: "tiktok", label: "TikTok", short: "TT", hosts: ["tiktok.com"] },
  { key: "youtube", label: "YouTube", short: "YT", hosts: ["youtube.com", "youtu.be"] },
  { key: "threads", label: "Threads", short: "@", hosts: ["threads.net", "threads.com"] },
  { key: "pinterest", label: "Pinterest", short: "P", hosts: ["pinterest.com"] },
  { key: "github", label: "GitHub", short: "GH", hosts: ["github.com"] },
  { key: "behance", label: "Behance", short: "Bē", hosts: ["behance.net"] },
  { key: "dribbble", label: "Dribbble", short: "Dr", hosts: ["dribbble.com"] },
  { key: "upwork", label: "Upwork", short: "Up", hosts: ["upwork.com"] },
  { key: "onlinejobs", label: "OnlineJobs.ph", short: "OJ", hosts: ["onlinejobs.ph"] },
  { key: "fiverr", label: "Fiverr", short: "Fi", hosts: ["fiverr.com"] },
  { key: "other", label: "Other link", short: "🔗", hosts: [] },
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialLink = { network: SocialNetwork; url: string; label?: string };

export const networkOf = (key: string) => SOCIAL_NETWORKS.find((n) => n.key === key) ?? SOCIAL_NETWORKS[SOCIAL_NETWORKS.length - 1];

/** What people type → a full https link: "facebook.com/maria", "www.x.com/maria" and "http://…" all work. */
export function normalizeLink(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^http:\/\//i.test(u)) return `https://${u.slice(7)}`;
  if (/^https:\/\//i.test(u)) return u;
  return `https://${u.replace(/^\/+/, "")}`;
}

/** A link on that network's own site ("Other": any site). Typed without https:// is fine. */
export function socialLinkOk(network: string, url: string): boolean {
  const u = normalizeLink(url);
  if (!u) return false;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || !host) return false;
    const hosts: readonly string[] = networkOf(network).hosts;
    return hosts.length === 0 || hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** What a link is called on the resume: the network, or the VA's own name for "Other". */
export const socialLabel = (l: SocialLink) => (l.network === "other" ? l.label || "Link" : networkOf(l.network).label);
