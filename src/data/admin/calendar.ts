import type { Tone } from "@/lib/tones";

// =============================================================================
// Booking calendar options and calendar-sync providers (pure UI constants).
// Calendars, hours, bookings and connections come from the API.
// =============================================================================

export const CALENDAR_SWATCHES = [
  { name: "Blue", hex: "#0891B2" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Teal", hex: "#0F9488" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Pink", hex: "#DB2777" },
  { name: "Green", hex: "#15803D" },
];

export const DURATIONS = [15, 30, 45, 60, 90] as const;
export const LOCATIONS = ["Zoom", "Phone call", "In person"] as const;

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type DayAvailability = { d: Weekday; on: boolean; start: string; end: string };

export const WEEKDAY_KEYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --------------------------------------------------------- Calendar sync
export type CalendarProviderField = { key: string; label: string; type: string; placeholder: string };

export type CalendarProvider = {
  /** The API's connection provider ("google" and "ics" are synced from a calendar link). */
  id: string;
  name: string;
  desc: string;
  initials: string;
  tone: Tone;
  /** Syncs today. Connections saved earlier for other providers show as "not syncing" with Disconnect. */
  available?: boolean;
  /** Offers "Connect with Google" (OAuth popup); the link form stays as the alternative. */
  oauth?: boolean;
  help: string;
  /** Where to find the link, step by step. */
  steps?: string[];
  /** Opens the calendar's settings in a new tab. */
  settingsUrl?: { label: string; href: string };
  fields: CalendarProviderField[];
};

/** The calendars that sync: busy times are read from the calendar's private iCal link every 15 minutes. */
export const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: "google", name: "Google Calendar", desc: "Gmail and Google Workspace", initials: "G", tone: "cyan", available: true, oauth: true,
    help: "Or paste your calendar’s private iCal address instead of signing in. Either way we only see when you are busy.",
    steps: [
      "Open Google Calendar settings (button below).",
      "Under “Settings for my calendars”, click your calendar.",
      "Scroll to “Integrate calendar” and copy “Secret address in iCal format”.",
      "Paste it here and save.",
    ],
    settingsUrl: { label: "Open Google Calendar settings ↗", href: "https://calendar.google.com/calendar/r/settings" },
    fields: [{ key: "server", label: "Secret address in iCal format", type: "url", placeholder: "https://calendar.google.com/calendar/ical/…/private-…/basic.ics" }],
  },
  {
    id: "ics", name: "iCal link", desc: "Outlook, iCloud or any calendar app", initials: "ICS", tone: "green", available: true,
    help: "Any calendar that can share an iCal (.ics) link.",
    steps: [
      "Outlook: Settings › Calendar › Shared calendars › Publish a calendar, then copy the ICS link.",
      "iCloud: in the Calendar app, share the calendar as a Public Calendar and copy the link.",
      "Other apps: look for “Export”, “Subscribe” or “iCal link” in the calendar’s settings.",
    ],
    fields: [{ key: "server", label: "Calendar link (https:// or webcal://)", type: "url", placeholder: "https://…/calendar.ics" }],
  },
];

/** A connection saved earlier for a provider that doesn't sync (it can only be disconnected). */
export const legacyProvider = (id: string): CalendarProvider => ({
  id, name: id.charAt(0).toUpperCase() + id.slice(1), desc: "Saved before sync was available", initials: id.slice(0, 2).toUpperCase(),
  tone: "slate", help: "", fields: [],
});
