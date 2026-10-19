import type { Tone } from "@/lib/tones";

// -----------------------------------------------------------------------------
// Sign-in page copy and options (pure UI constants). Accounts and roles come from the API.
// -----------------------------------------------------------------------------

export type BrandRow = { icon: string; label: string; value: string; tone: Tone };

/** Left-hand brand panel on the sign-in page. */
export const BRAND_PANEL = {
  kicker: "// CLIENT PORTAL",
  title: "Watch your system work, live.",
  body: "See your funnels, leads, daily reports and build progress, all in one portal.",
  panelTitle: "YOUR SYSTEM · ALL GREEN",
  rows: [
    { icon: "▲", label: "Funnels online", value: "4 / 4", tone: "green" },
    { icon: "+", label: "Leads captured today", value: "23", tone: "cyan" },
    { icon: "%", label: "Uptime, last 30 days", value: "99.98%", tone: "amber" },
  ] satisfies BrandRow[],
};

export const SSO_PROVIDERS: Array<{ id: "google" | "microsoft"; label: string; mark: string; tone: Tone }> = [
  { id: "google", label: "Google", mark: "G", tone: "green" },
  { id: "microsoft", label: "Microsoft", mark: "M", tone: "cyan" },
];
