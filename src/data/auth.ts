import type { Tone } from "@/lib/tones";

// -----------------------------------------------------------------------------
// Demo sign-in data. Replace with real authentication before going live.
// -----------------------------------------------------------------------------

/** These emails are treated as GoCWGL admins and get the 2-step code screen. */
export const ADMIN_EMAILS = ["christian@gocwgl.com", "wendy@gocwgl.com"];

/** Demo password for admin accounts. Any other email signs in as a client. */
export const DEMO_ADMIN_PASSWORD = "GoCWGL2026!";
export const DEMO_ADMIN_EMAIL = "christian@gocwgl.com";
export const DEMO_CLIENT_EMAIL = "aisha@rahmanwellness.com";

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

export const SSO_PROVIDERS: Array<{ label: string; mark: string; tone: Tone }> = [
  { label: "Google", mark: "G", tone: "green" },
  { label: "Microsoft", mark: "M", tone: "cyan" },
];
