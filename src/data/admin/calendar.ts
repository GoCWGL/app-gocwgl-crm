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
export const LOCATIONS = ["Google Meet", "Zoom", "Phone call", "In person"] as const;

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type DayAvailability = { d: Weekday; on: boolean; start: string; end: string };

export const WEEKDAY_KEYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --------------------------------------------------------- Calendar sync
export type CalendarProviderField = { key: string; label: string; type: string; placeholder: string };

export type CalendarProvider = {
  id: "google" | "outlook" | "apple" | "exchange" | "caldav" | "ics";
  name: string;
  desc: string;
  initials: string;
  tone: Tone;
  /** Signs in with OAuth instead of a password. */
  oauth: boolean;
  readOnly?: boolean;
  help: string;
  fields: CalendarProviderField[];
};

export const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: "google", name: "Google Calendar", desc: "Gmail and Google Workspace", initials: "G", tone: "cyan", oauth: true,
    help: "You will be sent to Google to sign in and allow access. We only read busy times and add bookings.",
    fields: [{ key: "account", label: "Google account email", type: "email", placeholder: "you@gmail.com" }],
  },
  {
    id: "outlook", name: "Outlook / Microsoft 365", desc: "Outlook.com, Hotmail and Office 365", initials: "O", tone: "sky", oauth: true,
    help: "You will be sent to Microsoft to sign in and allow calendar access.",
    fields: [{ key: "account", label: "Microsoft account email", type: "email", placeholder: "you@outlook.com" }],
  },
  {
    id: "apple", name: "Apple iCloud Calendar", desc: "iPhone, iPad and Mac calendars", initials: "", tone: "slate", oauth: false,
    help: "Apple needs an app-specific password. Create one at appleid.apple.com › Sign-In and Security › App-Specific Passwords.",
    fields: [
      { key: "account", label: "Apple ID email", type: "email", placeholder: "you@icloud.com" },
      { key: "secret", label: "App-specific password", type: "password", placeholder: "xxxx-xxxx-xxxx-xxxx" },
    ],
  },
  {
    id: "exchange", name: "Microsoft Exchange", desc: "Company Exchange servers", initials: "Ex", tone: "purple", oauth: false,
    help: "Ask your IT team for the Exchange server address if you do not know it.",
    fields: [
      { key: "account", label: "Work email", type: "email", placeholder: "you@company.com" },
      { key: "server", label: "Server (optional)", type: "text", placeholder: "outlook.office365.com" },
      { key: "secret", label: "Password", type: "password", placeholder: "" },
    ],
  },
  {
    id: "caldav", name: "Other (CalDAV)", desc: "Zoho, Fastmail, Yahoo, Nextcloud and more", initials: "CD", tone: "brand", oauth: false,
    help: "Works with any calendar that supports CalDAV. Find the server URL in your calendar app’s settings.",
    fields: [
      { key: "server", label: "CalDAV server URL", type: "url", placeholder: "https://caldav.example.com" },
      { key: "account", label: "Username", type: "text", placeholder: "" },
      { key: "secret", label: "Password", type: "password", placeholder: "" },
    ],
  },
  {
    id: "ics", name: "ICS calendar link", desc: "Read-only feed from any app", initials: "ICS", tone: "green", oauth: false, readOnly: true,
    help: "Paste a public or secret .ics link. We check it for busy times every 15 minutes. Bookings cannot be written to it.",
    fields: [{ key: "server", label: "Calendar link (.ics)", type: "url", placeholder: "https://…/calendar.ics" }],
  },
];
